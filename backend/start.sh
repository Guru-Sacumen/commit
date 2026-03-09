#!/bin/bash

# ConnectX Backend Startup Script

echo "🚀 Starting ConnectX Backend..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Check if Redis is running
if ! redis-cli ping > /dev/null 2>&1; then
    echo "⚠️  Redis is not running. Please start Redis server."
    echo "   On Ubuntu/Debian: sudo systemctl start redis-server"
    echo "   On macOS: brew services start redis"
    echo "   Or run: redis-server"
fi

# Check if PostgreSQL is running
if ! pg_isready > /dev/null 2>&1; then
    echo "⚠️  PostgreSQL is not running. Please start PostgreSQL server."
    echo "   On Ubuntu/Debian: sudo systemctl start postgresql"
    echo "   On macOS: brew services start postgresql"
fi

# Run database migrations
echo "🗄️  Running database migrations..."
alembic upgrade head

# Start Celery worker (in background)
echo "🔄 Starting Celery worker..."
celery -A celery_app worker --loglevel=info --detach

# Start FastAPI server
echo "🌐 Starting FastAPI server..."
echo "   Server will be available at: http://localhost:8000"
echo "   API docs at: http://localhost:8000/docs"
echo "   Press Ctrl+C to stop"

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
