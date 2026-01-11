#!/bin/bash

# ChromePilot Test Suite Runner
# Validates prerequisites and runs tests

set -e

echo "=== ChromePilot Test Suite Runner ==="
echo ""

# Check if server is running
echo "Checking if ChromePilot server is running..."
if ! nc -z localhost 9000 2>/dev/null; then
  echo "❌ ERROR: ChromePilot server is not running on port 9000"
  echo ""
  echo "Please start the server first:"
  echo "  cd native-host"
  echo "  node browser-pilot-server.js"
  echo ""
  exit 1
fi
echo "✓ Server is running on port 9000"
echo ""

# Check if Chrome is running
echo "Checking if Chrome is running..."
if ! pgrep -x "Google Chrome" > /dev/null; then
  echo "⚠️  WARNING: Chrome does not appear to be running"
  echo "Please ensure Chrome is running with the ChromePilot extension loaded"
  echo ""
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
else
  echo "✓ Chrome is running"
fi
echo ""

# Check if test dependencies are installed
echo "Checking test dependencies..."
if [ ! -d "node_modules" ]; then
  echo "Installing test dependencies..."
  npm install
  echo "✓ Dependencies installed"
else
  echo "✓ Dependencies already installed"
fi
echo ""

# Run tests
echo "Running test suite..."
echo ""
npm test

# Report results
if [ $? -eq 0 ]; then
  echo ""
  echo "==================================="
  echo "✅ All tests passed successfully!"
  echo "==================================="
  exit 0
else
  echo ""
  echo "==================================="
  echo "❌ Some tests failed"
  echo "==================================="
  exit 1
fi
