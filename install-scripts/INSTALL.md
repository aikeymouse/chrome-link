# ChromePilot Installer

Cross-platform installation tool for ChromePilot native host.

## Requirements

- Node.js 18+ and npm
- Google Chrome browser
- macOS, Linux, or Windows

## Quick Start

```bash
node install.js
```

This will:
1. Check Node.js and npm versions
2. Copy native host files to `~/.chrome-pilot/` (macOS/Linux) or `%LOCALAPPDATA%\ChromePilot\` (Windows)
3. Install Node.js dependencies
4. Register native messaging host with Chrome
5. Preserve existing logs during upgrade

## Commands

### install
Install or upgrade ChromePilot native host (default command)

```bash
node install.js
# or
node install.js install
```

**What it does:**
- Creates installation directory
- Backs up existing logs (if upgrading)
- Copies native host files
- Restores logs from backup
- Runs `npm install --production`
- Creates native messaging manifest for Chrome
- Verifies installation

**Installation paths:**
- **macOS**: `~/.chrome-pilot/native-host/`
- **Linux**: `~/.chrome-pilot/native-host/`
- **Windows**: `%LOCALAPPDATA%\ChromePilot\native-host\`

**Native messaging manifest:**
- **macOS**: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/`
- **Linux**: `~/.config/google-chrome/NativeMessagingHosts/`
- **Windows**: `%LOCALAPPDATA%\Google\Chrome\User Data\NativeMessagingHosts\`

### diagnose
Run diagnostic checks on your installation

```bash
node install.js diagnose
```

**Checks:**
- Node.js and npm versions
- Installation directory exists
- Native host server file exists
- Node.js dependencies installed
- Native messaging manifest registered
- Extension ID configured
- Recent log files

**Output example:**
```
[INFO] ChromePilot - Diagnostics
==========================

System Information:
  OS: darwin
  Node.js: v22.16.0
  npm: 10.9.2

Installation Status:
  Install Dir: /Users/user/.chrome-pilot [OK]
  Native Host: Found [OK]
  Dependencies: Installed [OK]

Native Messaging Manifest:
  Location: .../com.chromepilot.extension.json [OK]
  Extension ID: Set [OK]

Recent Logs:
  session-abc123-1768108888180.log (94905 bytes)
  ...
```

### update-id
Update the Chrome extension ID in the native messaging manifest

```bash
node install.js update-id <extension-id>
```

**Arguments:**
- `<extension-id>`: Your Chrome extension ID (32 lowercase letters)

**Example:**
```bash
node install.js update-id abcdefghijklmnopqrstuvwxyzabcdef
```

**What it does:**
- Validates extension ID format (must be 32 lowercase letters)
- Creates backup of current manifest
- Updates `allowed_origins` in manifest with your extension ID
- Verifies the update was successful

**How to get your extension ID:**
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Find ChromePilot extension
4. Copy the ID shown below the extension name

### uninstall
Remove ChromePilot installation completely

```bash
node install.js uninstall
```

**What it removes:**
- Installation directory (`~/.chrome-pilot/` or `%LOCALAPPDATA%\ChromePilot\`)
- Native messaging manifest
- All logs and data
- Running server processes

**Note:** You must manually remove the Chrome extension:
1. Open `chrome://extensions/`
2. Find ChromePilot
3. Click "Remove"

### version
Show installed version

```bash
node install.js version
# or
node install.js --version
node install.js -v
```

### help
Show help message with all commands

```bash
node install.js help
# or
node install.js --help
node install.js -h
```

## Complete Installation Guide

### Step 1: Install Native Host

```bash
cd chromepilot-native-host-v*/install-scripts
node install.js
```

You should see:
```
[INFO] ChromePilot - Installer
==========================

[INFO] Checking dependencies...
[OK] Node.js v22.16.0 found
[OK] npm 10.9.2 found
[INFO] Installing from local files...
[INFO] Backing up existing logs...
[INFO] Copying native host files...
[INFO] Restoring logs...
[INFO] Installing Node.js dependencies...
[INFO] Registering native messaging host...
[OK] Native host registered
[INFO] Verifying installation...
[OK] Installation verified
[OK] Installation complete!
```

### Step 2: Load Chrome Extension

1. Download `chromepilot-extension-v*.zip` (separate download)
2. Extract the zip file
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" (toggle in top right)
5. Click "Load unpacked"
6. Select the extracted extension folder
7. Copy the extension ID (shown below extension name)

### Step 3: Update Extension ID

```bash
node install.js update-id <your-extension-id>
```

Example:
```bash
node install.js update-id abcdefghijklmnopqrstuvwxyzabcdef
```

### Step 4: Restart Chrome

Close and reopen Chrome completely for changes to take effect.

### Step 5: Verify Connection

1. Click the ChromePilot extension icon
2. Side panel should open
3. Check connection status (should show "Connected")

## Troubleshooting

### Installation fails with "Node.js 18+ required"

**Solution:** Upgrade Node.js
```bash
# Check current version
node --version

# Install latest LTS from https://nodejs.org/
```

### "Extension ID: NOT SET [WARNING]"

**Solution:** Update the extension ID
```bash
# Get extension ID from chrome://extensions/
node install.js update-id <your-extension-id>
```

### "Native Host: NOT FOUND [ERROR]"

**Solution:** Reinstall
```bash
node install.js
```

### Extension shows "Disconnected"

**Solution:** Check diagnostics and restart
```bash
# Run diagnostics
node install.js diagnose

# Check for errors, then restart Chrome
```

### "Port 9000 already in use"

**Solution:** Kill existing processes
```bash
# macOS/Linux
lsof -ti :9000 | xargs kill -9

# Windows
netstat -ano | findstr :9000
taskkill /PID <PID> /F
```

### Logs show errors

**Solution:** Check log files
- **macOS/Linux**: `~/.chrome-pilot/native-host/logs/`
- **Windows**: `%LOCALAPPDATA%\ChromePilot\native-host\logs\`

View recent logs:
```bash
# macOS/Linux
tail -f ~/.chrome-pilot/native-host/logs/*.log

# Windows
Get-Content $env:LOCALAPPDATA\ChromePilot\native-host\logs\*.log -Tail 50
```

## Upgrading

To upgrade to a new version:

```bash
# The installer automatically backs up logs and restores them
node install.js
```

The installer will:
1. Detect existing installation
2. Create timestamped backup of logs
3. Install new version
4. Restore logs from backup
5. Update dependencies

## Uninstalling

To completely remove ChromePilot:

```bash
# Remove native host
node install.js uninstall

# Then manually remove Chrome extension from chrome://extensions/
```

## Platform-Specific Notes

### macOS

- Installation directory: `~/.chrome-pilot/`
- Manifest location: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/`
- Server runs via Node.js executable from system PATH

### Linux

- Installation directory: `~/.chrome-pilot/`
- Manifest location: `~/.config/google-chrome/NativeMessagingHosts/`
- Requires Chrome or Chromium browser

### Windows

- Installation directory: `%LOCALAPPDATA%\ChromePilot\`
- Manifest location: `%LOCALAPPDATA%\Google\Chrome\User Data\NativeMessagingHosts\`
- May require PowerShell execution policy adjustment

## Files Created

### Installation Directory Structure

```
~/.chrome-pilot/  (or %LOCALAPPDATA%\ChromePilot\ on Windows)
└── native-host/
    ├── browser-pilot-server.js    # Main server
    ├── package.json               # Dependencies
    ├── node_modules/              # Installed packages
    └── logs/                      # Session logs
        └── session-*.log
```

### Native Messaging Manifest

**File:** `com.chromepilot.extension.json`

**Contents:**
```json
{
  "name": "com.chromepilot.extension",
  "description": "ChromePilot Native Messaging Host",
  "path": "/path/to/node",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://<your-extension-id>/"
  ],
  "command": ["/path/to/node", "/path/to/browser-pilot-server.js"]
}
```

## Environment Variables

The installer uses these environment variables:

- `HOME` (macOS/Linux): User home directory
- `LOCALAPPDATA` (Windows): Local application data directory
- `PATH`: To find Node.js executable

## Exit Codes

- `0`: Success
- `1`: Error (check error message)

## Getting Help

- Run diagnostics: `node install.js diagnose`
- View help: `node install.js help`
- Check logs in installation directory
- Report issues on GitHub

## Advanced Usage

### Silent Installation (No User Prompts)

The installer runs non-interactively by default. For automation:

```bash
node install.js 2>&1 | tee install.log
```

### Custom Node.js Path

The installer uses the Node.js executable from your current environment:

```bash
# Use specific Node.js version
/path/to/node install.js

# Or use nvm
nvm use 18
node install.js
```

### Preserve Specific Logs

Logs are automatically backed up and restored. To manually preserve:

```bash
# Before installation
cp -r ~/.chrome-pilot/native-host/logs ~/backup-logs

# After installation
cp -r ~/backup-logs/* ~/.chrome-pilot/native-host/logs/
```

## Development

For development with local source:

```bash
# From repository root
cd install-scripts
node install.js

# This installs from ../native-host/
```

## Differences from Platform-Specific Installers

The Node.js installer (`install.js`) is the recommended cross-platform solution:

- ✅ Works on macOS, Linux, and Windows
- ✅ Single codebase, easier to maintain
- ✅ Better error handling with JavaScript
- ✅ No shell/PowerShell version conflicts
- ✅ Consistent behavior across platforms

Alternative installers:
- `install.sh` - Bash script for macOS/Linux
- `install.ps1` - PowerShell script for Windows

All installers provide the same functionality.
