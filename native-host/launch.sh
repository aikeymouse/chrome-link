#!/bin/bash
# ChromeLink Native Host Launcher
# This wrapper ensures the correct node version is used

# Don't kill existing process - let the new one handle port conflict
# if lsof -ti :9000 >/dev/null 2>&1; then
#   lsof -ti :9000 | xargs kill -9 2>/dev/null
#   sleep 2
# fi

# Set PATH to include common node locations
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
export PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH"
export PATH="$HOME/.nvm/versions/node/v18.19.0/bin:$PATH"
export PATH="/usr/local/bin:$PATH"
export PATH="/opt/homebrew/bin:$PATH"

# Change to the native host directory
cd "$(dirname "$0")"

# Launch the server with error logging
exec node browser-link-server.js 2>> /tmp/chromelink-error.log
