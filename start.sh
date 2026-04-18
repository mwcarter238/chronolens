#!/bin/bash
# ChronoLens startup script
# Starts the backend API and frontend dev server

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$SCRIPT_DIR/backend"
FRONTEND="$SCRIPT_DIR/frontend"

echo "🚀 ChronoLens"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Backend
echo "📦 Setting up backend..."
cd "$BACKEND"
if [ ! -d "venv" ]; then
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt -q
else
  source venv/bin/activate
fi

echo "⚡ Starting backend on http://localhost:8000 ..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Frontend
echo "📦 Setting up frontend..."
cd "$FRONTEND"
if [ ! -d "node_modules" ]; then
  npm install -q
fi

echo "⚡ Starting frontend on http://localhost:5173 ..."
npm run dev &
FRONTEND_PID=$!

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ChronoLens is running!"
echo ""
echo "   Frontend:  http://localhost:5173"
echo "   API docs:  http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; echo 'Stopped.'" SIGINT SIGTERM
wait
