#!/usr/bin/env bash
# =====================================================================
# Machina Telemetry Lab - One-Click Launcher Script
# =====================================================================

set -e
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "====================================================================="
echo "🔬 Starting Machina Telemetry Lab..."
echo "====================================================================="

# Check Python3 availability
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is required to run this application."
    exit 1
fi

PYTHON_VER=$(python3 --version 2>&1)
echo "✅ Environment: $PYTHON_VER detected."
echo "🚀 Initializing HTTP Server & Telemetry Engine..."

# Start the web server
exec python3 backend/server.py "$@"
