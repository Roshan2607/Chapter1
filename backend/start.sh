#!/bin/bash
# Start the AI Tutor backend

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "ERROR: .env file not found. Create it with: GROQ_API_KEY=your_key_here"
  exit 1
fi

echo "Starting AI Tutor backend on http://localhost:8000"
echo "Ctrl+C to stop"
echo ""

python main.py
