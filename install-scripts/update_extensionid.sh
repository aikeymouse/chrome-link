#!/bin/bash

# Update ChromePilot Extension ID in Native Host Manifest
# Usage: ./update_extensionid.sh <extension_id>

set -e

EXTENSION_ID="$1"
NATIVE_HOST_NAME="com.chromepilot.extension"

# Validate extension ID
if [ -z "$EXTENSION_ID" ]; then
    echo "❌ Error: Extension ID is required"
    echo ""
    echo "Usage: $0 <extension_id>"
    echo ""
    echo "To get your extension ID:"
    echo "1. Open Chrome: chrome://extensions/"
    echo "2. Enable 'Developer mode'"
    echo "3. Load the extension from: extension/"
    echo "4. Copy the extension ID (32 characters)"
    echo ""
    exit 1
fi

# Validate extension ID format (should be 32 lowercase letters)
if ! [[ "$EXTENSION_ID" =~ ^[a-z]{32}$ ]]; then
    echo "❌ Error: Invalid extension ID format"
    echo "Expected: 32 lowercase letters (a-z)"
    echo "Got: $EXTENSION_ID"
    exit 1
fi

echo "🔧 Updating ChromePilot Extension ID"
echo ""

# Determine OS and manifest path
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    MANIFEST_PATH="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/${NATIVE_HOST_NAME}.json"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    MANIFEST_PATH="$HOME/.config/google-chrome/NativeMessagingHosts/${NATIVE_HOST_NAME}.json"
else
    echo "❌ Error: Unsupported OS: $OSTYPE"
    echo "This script supports macOS and Linux only"
    echo "For Windows, manually edit the registry or manifest file"
    exit 1
fi

# Check if manifest exists
if [ ! -f "$MANIFEST_PATH" ]; then
    echo "❌ Error: Native host manifest not found"
    echo "Expected location: $MANIFEST_PATH"
    echo ""
    echo "Please run the installation script first:"
    echo "  ./install-scripts/install.sh"
    exit 1
fi

echo "📍 Manifest location: $MANIFEST_PATH"
echo "🆔 New Extension ID: $EXTENSION_ID"
echo ""

# Backup original manifest
BACKUP_PATH="${MANIFEST_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$MANIFEST_PATH" "$BACKUP_PATH"
echo "✓ Backup created: $BACKUP_PATH"

# Read current manifest
MANIFEST_CONTENT=$(cat "$MANIFEST_PATH")

# Extract current extension ID (from allowed_origins array)
CURRENT_ID=$(echo "$MANIFEST_CONTENT" | grep -o 'chrome-extension://[a-z]\{32\}/' | head -1 | sed 's/chrome-extension:\/\///' | sed 's/\///')

if [ -n "$CURRENT_ID" ]; then
    echo "📝 Current Extension ID: $CURRENT_ID"
    
    # Replace the extension ID
    UPDATED_CONTENT=$(echo "$MANIFEST_CONTENT" | sed "s/$CURRENT_ID/$EXTENSION_ID/g")
else
    echo "📝 No existing extension ID found, adding new one"
    
    # Replace placeholder
    UPDATED_CONTENT=$(echo "$MANIFEST_CONTENT" | sed "s/EXTENSION_ID_PLACEHOLDER/$EXTENSION_ID/g")
fi

# Write updated manifest
echo "$UPDATED_CONTENT" > "$MANIFEST_PATH"

echo "✓ Manifest updated successfully"
echo ""

# Verify the update
if grep -q "$EXTENSION_ID" "$MANIFEST_PATH"; then
    echo "✅ Verification successful!"
    echo ""
    echo "Updated manifest content:"
    echo "------------------------"
    cat "$MANIFEST_PATH"
    echo "------------------------"
    echo ""
    echo "Next steps:"
    echo "1. Restart Chrome completely (Quit and reopen)"
    echo "2. Click the ChromePilot extension icon to open side panel"
    echo "3. Verify 'Connected' status appears"
    echo ""
    echo "If you see 'Disconnected', check:"
    echo "  - Extension is loaded in chrome://extensions/"
    echo "  - Extension ID matches: $EXTENSION_ID"
    echo "  - Chrome was fully restarted"
else
    echo "❌ Error: Update verification failed"
    echo "Restoring backup..."
    cp "$BACKUP_PATH" "$MANIFEST_PATH"
    echo "Manifest restored from backup"
    exit 1
fi
