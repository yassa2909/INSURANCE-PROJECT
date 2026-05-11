#!/bin/bash

# PolicyHub Chatbot - Unix/Linux/Mac Startup Script
# This script starts all three services needed for the chatbot

set -e

MAIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "========================================"
echo "PolicyHub Insurance Chatbot"
echo "Starting all services..."
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -d "client" ]; then
    echo "Error: client directory not found. Please run this script from the project root."
    exit 1
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed. Please install Python 3.8+"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js 16+"
    exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed."
    exit 1
fi

# Start RAG Backend
echo "[1/2] Starting RAG Backend (FastAPI) on port 8000..."
echo ""
cd "$MAIN_DIR/server/rag-for-beginners"

# Install Python dependencies if needed
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Source the virtual environment
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi

# Install requirements
pip install -q -r requirements.txt 2>/dev/null || true

# Start RAG backend in background
python3 main.py > /tmp/rag-backend.log 2>&1 &
RAG_PID=$!
echo "RAG Backend started (PID: $RAG_PID)"
echo ""
sleep 2

# Start Frontend
echo "[2/2] Starting Frontend (React) on port 5173..."
echo ""
cd "$MAIN_DIR/client"

# Install npm dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install -q
fi

# Start frontend in background
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started (PID: $FRONTEND_PID)"
echo ""

sleep 2

echo "========================================"
echo "Services started!"
echo "========================================"
echo ""
echo "Frontend:     http://localhost:5173"
echo "RAG Backend:  http://localhost:8000"
echo ""
echo "The chatbot should be ready to use."
echo ""
echo "To stop all services, run:"
echo "  kill $RAG_PID $FRONTEND_PID"
echo ""
echo "For more information, see: README_CHATBOT_SETUP.md"
echo ""

# Wait for any key press or Ctrl+C
echo "Press Ctrl+C to stop all services..."
trap "kill $RAG_PID $FRONTEND_PID 2>/dev/null || true; echo 'Services stopped.'; exit 0" SIGINT

wait
