# Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- Google Chrome browser
- macOS, Linux, or Windows

## Installation (5 minutes)

### Step 1: Install Native Host

**All Platforms (macOS/Linux/Windows):**
```bash
cd chrome-driver-extension/install-scripts
node install.js
```

This will:
- Create installation directory (`~/.chromelink/` on macOS/Linux or `%USERPROFILE%\.chromelink\` on Windows)
- Copy native host files
- Install Node.js dependencies
- Register native messaging host with Chrome
- Preserve existing logs during upgrade

### Step 2: Load Extension in Chrome

1. Open Chrome: `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `extension/` folder from the project directory
5. **Copy your extension ID** (looks like: `abcdefghijklmnopqrstuvwxyz123456`)

### Step 3: Update Extension ID

Use the installer to update your extension ID:

```bash
node install.js update-id <your-extension-id>
```

**Example:**
```bash
node install.js update-id abcdefghijklmnopqrstuvwxyzabcdef
```

This automatically updates the native messaging manifest with your extension ID.

### Step 4: Restart Chrome

Completely quit and restart Chrome.

### Step 5: Test

1. Click the extension icon in Chrome toolbar
2. Side panel opens showing "Connected" status
3. You should see "Connected" with a green dot

## Usage

### Connect from Your Application

```javascript
const WebSocket = require('ws');

// Create session
const ws = new WebSocket('ws://localhost:9000/session?timeout=300000');

ws.on('open', () => {
  console.log('Connected to ChromeLink');
  
  // List all tabs in current window
  ws.send(JSON.stringify({
    action: 'listTabs',
    requestId: 'req-1'
  }));
});

ws.on('message', (data) => {
  const response = JSON.parse(data.toString());
  console.log('Response:', response);
  
  if (response.type === 'sessionCreated') {
    console.log('Session ID:', response.sessionId);
  }
});
```

### Basic Commands

**List Tabs:**
```json
{
  "action": "listTabs",
  "requestId": "req-1"
}
```

**Open New Tab:**
```json
{
  "action": "openTab",
  "params": {
    "url": "https://example.com",
    "focus": true
  },
  "requestId": "req-2"
}
```

**Execute JavaScript:**
```json
{
  "action": "executeJS",
  "params": {
    "code": "document.title",
    "timeout": 30000
  },
  "requestId": "req-3"
}
```

## Verify Installation

### Check Installation Status

Use the diagnostic command to verify everything is set up correctly:

```bash
cd chrome-driver-extension/install-scripts
node install.js diagnose
```

This checks:
- Node.js and npm versions
- Installation directory and files
- Native messaging manifest
- Extension ID configuration
- Server status (port 9000)
- Recent log files

### Check Native Host

```bash
# macOS/Linux
lsof -i :9000

# Should show: node (browser-link-server.js) listening on port 9000
```

### Check Extension

1. Go to `chrome://extensions/`
2. Find "ChromeLink"
3. Click "service worker" to open console
4. Should see: "Connected to native host"

### Check Side Panel

1. Click extension icon
2. Should show:
   - Status: Connected (green)
   - Connected Clients: 0
   - Current Window Tabs list

## Troubleshooting

### "Disconnected" Status in Side Panel

**Fix:**
1. Check installation status: `node install.js diagnose`
2. Verify native host is running: `lsof -i :9000` (macOS/Linux)
3. If not running, restart Chrome
4. Check extension ID matches in manifest

### "Cannot connect to native host"

**Fix:**
```bash
# Run diagnostics
cd chrome-driver-extension/install-scripts
node install.js diagnose

# Verify extension ID is set correctly
node install.js update-id <your-extension-id>

# Restart Chrome completely
```

### WebSocket Connection Refused

**Fix:**
1. Open side panel - this starts the native host
2. Wait 2-3 seconds for server to start
3. Try connecting again
4. Check firewall allows localhost:9000

## Next Steps

- Read full documentation: `README.md`
- See API protocol: `docs/PROTOCOL.md`
- Development guide: `docs/dev/DEVELOPMENT.md`
- Installation details: `install-scripts/INSTALL.md`

## Additional Commands

### Clear Logs

Remove all session log files:
```bash
node install.js clear-logs
```

### Uninstall

Remove ChromeLink completely:
```bash
node install.js uninstall
```

Then manually remove the Chrome extension from `chrome://extensions/`

### Get Version

Check installed version:
```bash
node install.js version
```

## Example Client

Create `test.js`:

```javascript
const WebSocket = require('ws');

async function main() {
  const ws = new WebSocket('ws://localhost:9000/session?timeout=600000');
  
  await new Promise(resolve => ws.once('open', resolve));
  console.log('✓ Connected');
  
  // Helper to send command
  const send = (action, params = {}) => {
    return new Promise((resolve) => {
      const requestId = `req-${Date.now()}`;
      
      const handler = (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.requestId === requestId) {
          ws.off('message', handler);
          resolve(msg.result);
        }
      };
      
      ws.on('message', handler);
      ws.send(JSON.stringify({ action, params, requestId }));
    });
  };
  
  // List tabs
  const tabs = await send('listTabs');
  console.log('✓ Tabs:', tabs.tabs.length);
  
  // Open new tab
  const newTab = await send('openTab', { 
    url: 'https://example.com', 
    focus: true 
  });
  console.log('✓ Opened tab:', newTab.tab.id);
  
  // Wait for page load
  await new Promise(r => setTimeout(r, 2000));
  
  // Get title
  const result = await send('executeJS', { 
    code: 'document.title',
    tabId: newTab.tab.id
  });
  console.log('✓ Page title:', result.value);
  
  ws.close();
}

main().catch(console.error);
```

Run:
```bash
npm install ws
node test.js
```

Expected output:
```
✓ Connected
✓ Tabs: 3
✓ Opened tab: 123
✓ Page title: Example Domain
```

## Support

For issues, check:
1. Chrome service worker console: `chrome://extensions/` → "service worker"
2. Native host logs: `~/.chrome-driver-extension/native-host/logs/`
3. Side panel inspector: Right-click in panel → "Inspect"
