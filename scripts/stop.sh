#!/usr/bin/env bash
# IndusAI 2.0 — Stop all demo services
set -euo pipefail

echo "Stopping IndusAI 2.0 services..."

# Stop backend
if [ -f /tmp/indusai-backend.pid ]; then
    BACKEND_PID=$(cat /tmp/indusai-backend.pid)
    kill "$BACKEND_PID" 2>/dev/null && echo "  Backend (PID $BACKEND_PID) stopped" || true
    rm -f /tmp/indusai-backend.pid
fi

# Stop frontend
if [ -f /tmp/indusai-frontend.pid ]; then
    FRONTEND_PID=$(cat /tmp/indusai-frontend.pid)
    kill "$FRONTEND_PID" 2>/dev/null && echo "  Frontend (PID $FRONTEND_PID) stopped" || true
    rm -f /tmp/indusai-frontend.pid
fi

# Kill any remaining processes on the ports
lsof -ti:8000 | xargs kill -9 2>/dev/null && echo "  Cleared port 8000" || true
lsof -ti:5173 | xargs kill -9 2>/dev/null && echo "  Cleared port 5173" || true

# Stop Docker services
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"
docker compose down 2>/dev/null && echo "  Docker services stopped" || true

echo ""
echo "All services stopped."
