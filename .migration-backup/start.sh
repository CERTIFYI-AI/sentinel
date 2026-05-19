#!/bin/bash
set -e

echo "=== Starting Sentinel AI GRC Platform ==="

# Start the FastAPI backend on port 8000
echo "Starting backend API server..."
cd /home/runner/workspace
python3 -m uvicorn sentinel.api.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Start the Vite frontend on port 5000
echo "Starting frontend dev server..."
cd /home/runner/workspace/dashboard
npm run dev &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID, Frontend PID: $FRONTEND_PID"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
