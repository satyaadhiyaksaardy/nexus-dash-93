#!/bin/bash
################################################################################
# Server Monitoring Agent
# Purpose: Collect system metrics and send to monitoring backend
# Deploy: Copy to /opt/monitoring/agent.sh on each server
# Cron: * * * * * /opt/monitoring/agent.sh
################################################################################

set -euo pipefail

# ==================== CONFIGURATION ====================

# Load config from file if exists
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/config.env" ]; then
    source "$SCRIPT_DIR/config.env"
fi

API_ENDPOINT="${API_ENDPOINT:-http://your-backend-server:8000/api/report}"
API_KEY="${API_KEY:-your-super-secret-key-change-this}"
SERVER_ALIAS="${SERVER_ALIAS:-$(hostname -s)}"
MACHINE_TYPE="${MACHINE_TYPE:-host}"
GROUP="${GROUP:-production}"
LABELS="${LABELS:-}"  # Comma-separated, e.g., "gpu,cuda,ml"

# ==================== HELPER FUNCTIONS ====================

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >&2
}

check_command() {
    command -v "$1" >/dev/null 2>&1
}

# ==================== DATA COLLECTION ====================

get_cpu_info() {
    local cpu_percent=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d% -f1)
    local loadavg=$(cat /proc/loadavg | awk '{print $1,$2,$3}')

    read -r load1 load5 load15 <<< "$loadavg"

    cat <<EOF
{
  "percent": ${cpu_percent:-0},
  "loadavg": {
    "1m": ${load1:-0},
    "5m": ${load5:-0},
    "15m": ${load15:-0}
  }
}
EOF
}

get_memory_info() {
    local mem_total=$(free -g | awk '/^Mem:/{print $2}')
    local mem_used=$(free -g | awk '/^Mem:/{print $3}')
    local mem_percent=$(free | awk '/^Mem:/{printf "%.1f", $3/$2 * 100}')

    cat <<EOF
{
  "total_gb": ${mem_total:-0},
  "used_gb": ${mem_used:-0},
  "percent": ${mem_percent:-0}
}
EOF
}

get_disk_info() {
    # Get all mounted filesystems (excluding tmpfs, devtmpfs, etc.)
    df -BG | tail -n +2 | grep -vE 'tmpfs|devtmpfs|loop' | \
    awk '{
        gsub("G", "", $2); gsub("G", "", $3); gsub("G", "", $4); gsub("%", "", $5);
        printf "{\"mountpoint\":\"%s\",\"fstype\":\"ext4\",\"free_gb\":%s,\"total_gb\":%s,\"percent\":%s},",
               $6, $4, $2, $5
    }' | sed 's/,$//'
}

get_logged_users() {
    who | awk '{
        # Parse who output: username tty date time host
        printf "{\"name\":\"%s\",\"tty\":\"%s\",\"host\":\"%s\",\"started\":\"%s %s\"},",
               $1, $2, ($5 != "" ? $5 : "localhost"), $3, $4
    }' | sed 's/,$//'
}

get_gpu_info() {
    if ! check_command nvidia-smi; then
        echo "[]"
        return
    fi

    # Get GPU basic info including temperature, fan, and power
    local gpu_data=$(nvidia-smi --query-gpu=index,name,utilization.gpu,memory.used,memory.total,temperature.gpu,fan.speed,power.draw \
        --format=csv,noheader,nounits 2>/dev/null || echo "")

    if [ -z "$gpu_data" ]; then
        echo "[]"
        return
    fi

    # Get GPU processes using pmon (shows GPU index, PID, type, memory)
    # Format: gpu, pid, type, sm, mem, enc, dec, command
    local gpu_procs=$(nvidia-smi pmon -c 1 2>/dev/null | grep -E '^\s*[0-9]' | awk '{print $1"|"$2"|"$3"|"$5"|"$8}')

    # Build JSON output
    echo "$gpu_data" | awk -F', ' -v procs="$gpu_procs" '
    BEGIN {
        printf "["

        # Parse processes into array indexed by GPU
        proc_count = split(procs, proc_list, "\n")
        for (i = 1; i <= proc_count; i++) {
            split(proc_list[i], p, "|")
            gpu_id = p[1]
            pid = p[2]
            ptype = p[3]
            mem = p[4]
            cmd = p[5]

            # Get username for this PID
            "ps -o user= -p " pid " 2>/dev/null | xargs" | getline username
            close("ps -o user= -p " pid " 2>/dev/null | xargs")
            if (username == "") username = "unknown"

            # Store process info
            if (gpu_procs_json[gpu_id] == "") {
                gpu_procs_json[gpu_id] = sprintf("{\"pid\":%s,\"username\":\"%s\",\"cmd\":\"%s\",\"used_memory_mb\":%s,\"type\":\"%s\"}",
                    pid, username, cmd, (mem == "-" ? "0" : mem), ptype)
            } else {
                gpu_procs_json[gpu_id] = gpu_procs_json[gpu_id] "," sprintf("{\"pid\":%s,\"username\":\"%s\",\"cmd\":\"%s\",\"used_memory_mb\":%s,\"type\":\"%s\"}",
                    pid, username, cmd, (mem == "-" ? "0" : mem), ptype)
            }
        }
    }
    {
        if (NR > 1) printf ","

        gpu_index = $1

        # Build processes array for this GPU
        if (gpu_procs_json[gpu_index] != "") {
            processes = "[" gpu_procs_json[gpu_index] "]"
        } else {
            processes = "[]"
        }

        # Handle optional fields (N/A becomes null)
        temp = ($6 == "[N/A]" || $6 == "N/A" || $6 == "") ? "null" : $6
        fan = ($7 == "[N/A]" || $7 == "N/A" || $7 == "") ? "null" : $7
        power = ($8 == "[N/A]" || $8 == "N/A" || $8 == "") ? "null" : $8

        printf "{\"index\":%s,\"name\":\"%s\",\"utilization_pct\":%s,\"memory_used_mb\":%s,\"memory_total_mb\":%s,\"temperature_celsius\":%s,\"fan_speed_pct\":%s,\"power_draw_watts\":%s,\"processes\":%s}",
               $1, $2, $3, $4, $5, temp, fan, power, processes
    }
    END { printf "]" }
    '
}

get_containers() {
    if ! check_command docker; then
        echo "[]"
        return
    fi

    # Check if docker is accessible
    if ! docker ps >/dev/null 2>&1; then
        echo "[]"
        return
    fi

    # Get running containers
    docker ps -a --format '{{.ID}}|{{.Names}}|{{.Image}}|{{.State}}|{{.CreatedAt}}|{{.Ports}}' 2>/dev/null | \
    awk -F'|' '
    BEGIN { printf "[" }
    {
        if (NR > 1) printf ","

        # Get container stats
        cmd = "docker stats --no-stream --format \"{{.CPUPerc}}|{{.MemUsage}}\" " $1 " 2>/dev/null"
        cmd | getline stats
        close(cmd)

        split(stats, stat_parts, "|")
        cpu = stat_parts[1]
        gsub("%", "", cpu)

        mem = stat_parts[2]
        split(mem, mem_parts, " ")
        mem_val = mem_parts[1]

        # Convert memory to MB
        mem_mb = 0
        if (mem_val ~ /GiB/) {
            gsub("GiB", "", mem_val)
            mem_mb = mem_val * 1024
        } else if (mem_val ~ /MiB/) {
            gsub("MiB", "", mem_val)
            mem_mb = mem_val
        } else if (mem_val ~ /KiB/) {
            gsub("KiB", "", mem_val)
            mem_mb = mem_val / 1024
        }

        printf "{\"id\":\"%s\",\"name\":\"%s\",\"image\":\"%s\",\"state\":\"%s\",\"created\":\"%s\",\"ports\":\"%s\",\"cpu_pct\":%s,\"mem_mb\":%d}",
               $1, $2, $3, $4, $5, $6, (cpu != "" ? cpu : 0), int(mem_mb)
    }
    END { printf "]" }
    '
}

get_os_info() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo "$PRETTY_NAME"
    else
        uname -s
    fi
}

# ==================== BUILD JSON PAYLOAD ====================

build_payload() {
    local hostname=$(hostname)
    local ip=$(hostname -I | awk '{print $1}')
    local uptime=$(cat /proc/uptime | awk '{print int($1)}')
    local timestamp=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
    local os_info=$(get_os_info)

    # Convert labels to JSON array
    local labels_json="[]"
    if [ -n "$LABELS" ]; then
        labels_json=$(echo "$LABELS" | awk -F',' '{printf "["; for(i=1;i<=NF;i++) printf "\"%s\"%s", $i, (i<NF?",":""); printf "]"}')
    fi

    cat <<EOF
{
  "server_alias": "$SERVER_ALIAS",
  "hostname": "$hostname",
  "ip": "$ip",
  "uptime_seconds": $uptime,
  "cpu": $(get_cpu_info),
  "memory": $(get_memory_info),
  "disks": [$(get_disk_info)],
  "users": [$(get_logged_users)],
  "gpus": $(get_gpu_info),
  "containers": $(get_containers),
  "timestamp": "$timestamp",
  "machine_type": "$MACHINE_TYPE",
  "group": "$GROUP",
  "os": "$os_info",
  "labels": $labels_json
}
EOF
}

# ==================== SEND TO BACKEND ====================

send_report() {
    local payload="$1"

    log "Sending to: $API_ENDPOINT"

    local response=$(curl -X POST "$API_ENDPOINT" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $API_KEY" \
        -d "$payload" \
        --max-time 10 \
        --silent \
        --show-error \
        --write-out "\nHTTP_CODE:%{http_code}" 2>&1)

    local http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)

    if [ "$http_code" = "200" ]; then
        log "✅ Report sent successfully"
        return 0
    else
        log "❌ Failed to send report (HTTP $http_code)"
        if [ "${DEBUG:-0}" = "1" ]; then
            log "Response: $response"
        fi
        return 1
    fi
}

# ==================== MAIN ====================

main() {
    log "Starting monitoring agent for $SERVER_ALIAS"

    # Check dependencies
    for cmd in curl awk sed grep; do
        if ! check_command "$cmd"; then
            log "ERROR: Required command '$cmd' not found"
            exit 1
        fi
    done

    # Build and send payload
    local payload=$(build_payload)

    # Debug: Print payload if DEBUG=1
    if [ "${DEBUG:-0}" = "1" ]; then
        echo "$payload" | jq '.' 2>/dev/null || echo "$payload"
    fi

    send_report "$payload"
}

# Run main function
main "$@"
