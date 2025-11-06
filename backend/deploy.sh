#!/bin/bash
################################################################################
# Backend Deployment Script
# Purpose: Easy deployment of monitoring backend with Docker
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

        # Generate API key
        API_KEY=$(openssl rand -hex 32)

        # Update .env file
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/your-super-secret-key-change-this/$API_KEY/" .env
        else
            # Linux
            sed -i "s/your-super-secret-key-change-this/$API_KEY/" .env
        fi

        log_success ".env file created with generated API key"
        log_info "API Key: $API_KEY"
        log_warning "Save this API key - you'll need it for agent configuration!"
    else
        log_info ".env file already exists"
    fi
}

build_image() {
    log_info "Building Docker image..."
    # Use host network to fix DNS issues during build
    docker build --network=host -t monitoring-backend:latest .
    log_success "Docker image built successfully"
}

start_services() {
    log_info "Starting services with Docker Compose..."
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
    if curl -s http://localhost:8000/ > /dev/null; then
        log_success "Backend is responding on http://localhost:8000/"
    else
        log_warning "Backend is not responding yet"
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
Backend Deployment Script

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
    $0 start        # Start the backend
    $0 logs         # View logs
    $0 status       # Check if running

EOF
}

# Main script
case "${1:-setup}" in
    setup)
        log_info "Setting up backend..."
        check_docker
        setup_env
        build_image
        start_services
        echo ""
        show_status
        echo ""
        log_success "Setup complete!"
        log_info "Backend is running at: http://localhost:8000/"
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
