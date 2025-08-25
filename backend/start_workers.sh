#!/bin/bash

# DReflowPro Celery Workers Startup Script
# This script starts all necessary Celery workers and services

set -e

echo "🚀 Starting DReflowPro Celery Workers..."

# Check if Redis is running
if ! redis-cli ping > /dev/null 2>&1; then
    echo "❌ Redis is not running. Please start Redis first."
    echo "   brew services start redis  # macOS"
    echo "   sudo systemctl start redis  # Linux"
    exit 1
fi

echo "✅ Redis is running"

# Create log directory
mkdir -p logs

# Function to start a worker
start_worker() {
    local queue_name=$1
    local concurrency=${2:-2}
    local log_level=${3:-info}
    
    echo "🔧 Starting worker for queue: $queue_name (concurrency: $concurrency)"
    
    celery -A celery_worker worker \
        --loglevel=$log_level \
        --concurrency=$concurrency \
        --queues=$queue_name \
        --hostname="worker-$queue_name@%h" \
        --logfile="logs/worker-$queue_name.log" \
        --pidfile="logs/worker-$queue_name.pid" \
        --detach
}

# Start specialized workers for different queues
start_worker "pipelines" 3 "info"      # Pipeline execution (CPU intensive)
start_worker "data_processing" 4 "info" # Data processing (CPU intensive)  
start_worker "reports" 2 "info"        # Report generation (IO intensive)
start_worker "notifications" 5 "info"  # Notifications (fast, high volume)
start_worker "default" 2 "info"        # Default queue

# Start Celery Beat for scheduled tasks
echo "🕐 Starting Celery Beat scheduler..."
celery -A celery_worker beat \
    --loglevel=info \
    --logfile="logs/beat.log" \
    --pidfile="logs/beat.pid" \
    --detach

# Optional: Start Flower for monitoring (uncomment if needed)
# echo "🌸 Starting Flower monitoring (http://localhost:5555)..."
# celery -A celery_worker flower \
#     --port=5555 \
#     --logfile="logs/flower.log" \
#     --pidfile="logs/flower.pid" \
#     --detach

echo ""
echo "✅ All Celery services started successfully!"
echo ""
echo "📊 Monitor workers:"
echo "   celery -A celery_worker inspect active"
echo "   celery -A celery_worker inspect stats"
echo ""
echo "🛑 Stop workers:"
echo "   ./stop_workers.sh"
echo ""
echo "📋 Log files location: ./logs/"
echo "   - Worker logs: logs/worker-*.log"
echo "   - Beat scheduler: logs/beat.log"
echo ""

# Display active workers
sleep 2
echo "🔍 Active workers:"
celery -A celery_worker inspect active || echo "   (Workers starting up...)"