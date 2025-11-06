#!/bin/bash
################################################################################
# Dashboard Deployment Script
# Purpose: Easy deployment of monitoring dashboard with Docker
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_warning "docker-compose not found, checking for docker compose plugin..."
        if ! docker compose version &> /dev/null; then
            log_error "Docker Compose is not available. Please install it."
            exit 1
        fi
        DOCKER_COMPOSE="docker compose"
    else
        DOCKER_COMPOSE="docker-compose"
    fi

    log_success "Docker and Docker Compose are available"
}

setup_env() {
    if [ ! -f .env ]; then
        log_info "Creating .env file from template..."
        cp .env.example .env
        log_success ".env file created"
        log_warning "Please update VITE_API_BASE in .env to point to your backend"
    else
        log_info ".env file already exists"
    fi

    # Show current config
    log_info "Current API endpoint:"
    grep VITE_API_BASE .env || echo "VITE_API_BASE not set"
}

build_image() {
    log_info "Building Docker image..."
    log_warning "This may take a few minutes..."

    # Load env vars for build
    set -a
    source .env
    set +a

    docker build -t monitoring-dashboard:latest .
    log_success "Docker image built successfully"
}

start_services() {
    log_info "Starting services with Docker Compose..."

    # Load env vars
    set -a
    source .env
    set +a

    $DOCKER_COMPOSE up -d
    log_success "Services started"
}

stop_services() {
    log_info "Stopping services..."
    $DOCKER_COMPOSE down
    log_success "Services stopped"
}

restart_services() {
    log_info "Restarting services..."
    $DOCKER_COMPOSE restart
    log_success "Services restarted"
}

show_logs() {
    log_info "Showing logs (Ctrl+C to exit)..."
    $DOCKER_COMPOSE logs -f
}

show_status() {
    log_info "Service status:"
    $DOCKER_COMPOSE ps

    echo ""
    log_info "Health check:"
    if curl -s http://localhost:8080/health > /dev/null; then
        log_success "Dashboard is responding on http://localhost:8080/"
    else
        log_warning "Dashboard is not responding yet"
    fi
}

cleanup() {
    log_info "Cleaning up Docker resources..."
    $DOCKER_COMPOSE down -v
    docker image prune -f
    log_success "Cleanup complete"
}

show_help() {
    cat <<EOF
Dashboard Deployment Script

Usage: $0 [command]

Commands:
    setup       Setup environment and build image
    start       Start services
    stop        Stop services
    restart     Restart services
    logs        Show logs (live)
    status      Show service status
    cleanup     Stop services and cleanup volumes
    help        Show this help message

Examples:
    $0 setup        # First time setup
    $0 start        # Start the dashboard
    $0 logs         # View logs
    $0 status       # Check if running

EOF
}

# Main script
case "${1:-setup}" in
    setup)
        log_info "Setting up dashboard..."
        check_docker
        setup_env
        build_image
        start_services
        echo ""
        show_status
        echo ""
        log_success "Setup complete!"
        log_info "Dashboard is running at: http://localhost:8080/"
        log_info "Use '$0 logs' to view logs"
        ;;

    start)
        check_docker
        start_services
        show_status
        ;;

    stop)
        check_docker
        stop_services
        ;;

    restart)
        check_docker
        restart_services
        ;;

    logs)
        check_docker
        show_logs
        ;;

    status)
        check_docker
        show_status
        ;;

    cleanup)
        check_docker
        cleanup
        ;;

    help|--help|-h)
        show_help
        ;;

    *)
        log_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
