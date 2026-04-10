#!/bin/bash
set -e

# Start the FastAPI backend on port 8000 in the background
echo "Starting Sentinel API backend on port 8000..."
python -m uvicorn sentinel.api.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Give the backend a moment to start
sleep 2

# Start the Vite frontend on port 5000
echo "Starting Sentinel Dashboard frontend on port 5000..."
cd dashboard && npm run dev
