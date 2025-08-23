#!/bin/bash

# DReflowPro Celery Workers Stop Script
# This script gracefully stops all Celery workers and services

set -e

echo "🛑 Stopping DReflowPro Celery Workers..."

# Function to stop a service by pidfile
stop_service() {
    local service_name=$1
    local pidfile="logs/${service_name}.pid"
    
    if [ -f "$pidfile" ]; then
        local pid=$(cat "$pidfile")
        if ps -p $pid > /dev/null 2>&1; then
            echo "🔧 Stopping $service_name (PID: $pid)..."
            kill -TERM $pid
            
            # Wait for graceful shutdown
            local count=0
            while ps -p $pid > /dev/null 2>&1 && [ $count -lt 10 ]; do
                sleep 1
                count=$((count + 1))
            done
            
            # Force kill if still running
            if ps -p $pid > /dev/null 2>&1; then
                echo "⚠️  Force killing $service_name..."
                kill -KILL $pid
            fi
            
            rm -f "$pidfile"
            echo "✅ Stopped $service_name"
        else
            echo "⚠️  $service_name PID file exists but process not running"
            rm -f "$pidfile"
        fi
    else
        echo "ℹ️  No PID file found for $service_name"
    fi
}

# Stop all worker queues
stop_service "worker-pipelines"
stop_service "worker-data_processing"
stop_service "worker-reports"
stop_service "worker-notifications"
stop_service "worker-default"

# Stop Beat scheduler
stop_service "beat"

# Stop Flower if running
stop_service "flower"

# Alternative: Use Celery's multi command to stop all workers
echo "🧹 Cleaning up any remaining Celery processes..."
celery -A celery_worker control shutdown 2>/dev/null || true

# Kill any remaining celery processes (last resort)
pkill -f "celery.*worker" 2>/dev/null || true
pkill -f "celery.*beat" 2>/dev/null || true

echo ""
echo "✅ All Celery services stopped!"
echo ""
echo "🔍 Verify no Celery processes are running:"
echo "   ps aux | grep celery"
echo ""

# Clean up empty log files
find logs -name "*.log" -size 0 -delete 2>/dev/null || true

echo "📋 Log files preserved in ./logs/ for inspection"