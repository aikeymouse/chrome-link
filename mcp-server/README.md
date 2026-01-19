# ChromeLink MCP Server

Model Context Protocol (MCP) server that exposes Chrome browser automation capabilities to AI agents like Claude, GPT, and other MCP-compatible tools.

## Installation

### Option 1: NPM (Recommended)

```bash
npm install -g @aikeymouse/chromelink-mcp
```

Then configure in your MCP client:

```json
{
  "mcpServers": {
    "chrome-link": {
      "command": "chromelink-mcp"
    }
  }
}
```

### Option 2: From Source

Clone the repository and use the server directly:

```bash
git clone https://github.com/aikeymouse/chrome-link.git
cd chrome-link/mcp-server
npm install
```

Configure with absolute path:

```json
{
  "mcpServers": {
    "chrome-link": {
      "command": "node",
      "args": ["/absolute/path/to/chrome-link/mcp-server/index.js"]
    }
  }
}
```

## Prerequisites

1. **Install ChromeLink extension** in Chrome
2. **Start browser-link-server** (automatically started by extension on first connection)

## Local Development

For local development with file dependencies:

```bash
cd chrome-link/mcp-server
npm install  # Creates symlink to ../clients/node
```

The MCP server uses a local file dependency (`"@aikeymouse/chromelink-client": "file:../clients/node"`) for development. This is automatically converted to an npm dependency (`^1.2.0`) during publishing via the `prepublishOnly` script.

After version changes, update the symlink:
```bash
cd mcp-server && npm install
```

## Running the MCP Server

### From NPM Installation
```bash
chromelink-mcp
```

### From Source
```bash
node mcp-server/index.js
```

The MCP server will:
- Connect to `ws://localhost:9000` (browser-link-server)
- Expose 18 Chrome automation tools via MCP protocol
- Communicate with AI agents via stdio

## Available Tools

### Tab Management
- `chrome_list_tabs` - List all open tabs
- `chrome_open_tab` - Open new tab with URL
- `chrome_navigate_tab` - Navigate tab to URL
- `chrome_switch_tab` - Switch to specific tab
- `chrome_close_tab` - Close a tab
- `chrome_get_active_tab` - Get active tab info

### Navigation History
- `chrome_go_back` - Navigate back in history
- `chrome_go_forward` - Navigate forward in history

### DOM Interaction
- `chrome_wait_for_element` - Wait for element to appear
- `chrome_get_text` - Get element text content
- `chrome_click` - Click an element
- `chrome_type` - Type text into element

### JavaScript Execution
- `chrome_execute_js` - Execute arbitrary JavaScript
- `chrome_call_helper` - Call predefined helper functions:
  - **Element Interaction**: clickElement, typeText, appendChar, clearContentEditable
  - **Element Query**: getText, getHTML, getLastHTML, elementExists, isVisible, waitForElement
  - **Element Highlighting**: highlightElement, removeHighlights
  - **Element Positioning**: getElementBounds, scrollElementIntoView
  - **Element Inspection**: inspectElement, getContainerElements, extractPageElements

### Screenshots
- `chrome_capture_screenshot` - Capture tab screenshot (PNG/JPEG)

### Script Injection
- `chrome_register_injection` - Register content script
- `chrome_unregister_injection` - Unregister content script

## Element Extraction

The `extractPageElements` helper provides intelligent extraction of page elements with rich metadata for test automation and page object generation:

```javascript
// Extract all interactive elements from a form
const result = await callHelper('extractPageElements', {
  containerSelector: '#login-form'
});

// Result structure:
{
  container: {
    tagName: 'form',
    cssSelector: '#login-form',
    xpathSelector: '//form[@id="login-form"]',
    attributes: { id: 'login-form', method: 'POST', action: '/login' },
    textContent: 'Login to your account',
    visible: true,
    type: 'form'
  },
  elements: [
    {
      tagName: 'input',
      selector: '#username',
      xpathSelector: '//input[@id="username"]',
      attributes: { id: 'username', name: 'username', type: 'text', placeholder: 'Email' },
      textContent: '',
      visible: true,
      type: 'text-input'
    },
    {
      tagName: 'input',
      selector: '#password',
      xpathSelector: '//input[@id="password"]',
      attributes: { id: 'password', name: 'password', type: 'password' },
      textContent: '',
      visible: true,
      type: 'password-input'
    },
    {
      tagName: 'button',
      selector: '#login-form > button[type="submit"]',
      xpathSelector: '//button[@type="submit"]',
      attributes: { type: 'submit', class: 'btn-primary' },
      textContent: 'Sign In',
      visible: true,
      type: 'submit-button',
      baseType: 'button'
    }
  ],
  url: 'https://example.com/login',
  title: 'Login - Example Site',
  timestamp: '2024-01-15T10:30:00.000Z'
}

// Include hidden elements
const allElements = await callHelper('extractPageElements', {
  containerSelector: 'body',
  includeHidden: true
});
```

**Key Features:**
- **Dual Selectors**: Both CSS and XPath selectors for maximum flexibility
- **Semantic Types**: Automatic classification (text-input, button, link, checkbox, etc.)
- **ARIA Support**: Recognizes ARIA roles with baseType hierarchy (searchbox→textbox, switch→checkbox)
- **Direct Text**: Extracts only direct child text nodes (excludes nested elements)
- **Visibility Filtering**: Optional `includeHidden` parameter (default: false)
- **Rich Metadata**: All attributes, computed visibility, container context

**Element Types:**
- Form controls: `text-input`, `password-input`, `checkbox`, `radio`, `select`, `textarea`, `submit-button`, `reset-button`, `button`
- Navigation: `link`
- Media: `image`, `video`, `audio`
- Content: `heading`, `label`, `text`
- Semantic: ARIA roles (searchbox, switch, tab, menuitem, etc.)

**Use Cases:**
- Page object model generation for test automation
- Form analysis and data extraction
- Accessibility auditing (ARIA role verification)
- UI component discovery

## Configuration for AI Agents

### VS Code (GitHub Copilot)

**Prerequisites:**
- VS Code version 1.108 or later
- GitHub Copilot extension installed
- ChromeLink native host running (port 9000)

**Setup:**

1. **Create MCP configuration file** at:
   - **macOS/Linux**: `~/Library/Application Support/Code/User/mcp.json`
   - **Windows**: `%APPDATA%\Code\User\mcp.json`

2. **Add ChromeLink server:**

   **Option A: Global NPM installation (recommended)**
   ```json
   {
     "servers": {
       "chromelink": {
         "type": "stdio",
         "command": "chromelink-mcp"
       }
     },
     "inputs": []
   }
   ```

   **Option B: Local installation**
   ```json
   {
     "servers": {
       "chromelink": {
         "type": "stdio",
         "command": "node",
         "args": [
           "/absolute/path/to/chrome-driver-extension/mcp-server/bin/chromelink-mcp"
         ]
       }
     },
     "inputs": []
   }
   ```

   **Option C: Using npx**
   ```json
   {
     "servers": {
       "chromelink": {
         "type": "stdio",
         "command": "npx",
         "args": [
           "chromelink-mcp"
         ]
       }
     },
     "inputs": []
   }
   ```

3. **Reload VS Code**: Press `Cmd+Shift+P` (or `Ctrl+Shift+P` on Windows) → "Developer: Reload Window"

4. **Verify**: Open GitHub Copilot Chat and ask: "What MCP tools do you have?"

**Quick Example:**

```
You: List all my Chrome tabs

Copilot: [Uses chrome_list_tabs to show all open tabs]

You: Open google.com in a new tab

Copilot: [Uses chrome_open_tab to create new tab with URL]

You: Take a screenshot of the active tab

Copilot: [Uses chrome_capture_screenshot and shows the image]
```

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "chrome-link": {
      "command": "node",
      "args": ["/absolute/path/to/chrome-driver-extension/mcp-server/index.js"]
    }
  }
}
```

**Important**: Use absolute path to `index.js`

After configuration:
1. Restart Claude Desktop
2. Start a conversation
3. Ask Claude: "What Chrome tools do you have?"

### Example Prompts

```
Open https://github.com in a new Chrome tab

List all my open Chrome tabs

Go to https://example.com and get the text of the h1 element

Take a screenshot of the current tab in PNG format

Fill out the login form:
1. Open https://the-internet.herokuapp.com/login
2. Type "tomsmith" in #username
3. Type "SuperSecretPassword!" in #password
4. Click the login button
```

## Architecture

```
AI Agent (Claude/GPT)
    ↓ stdio (MCP protocol)
MCP Server (this file)
    ↓ WebSocket (ws://localhost:9000)
browser-link-server
    ↓ native messaging (stdin/stdout)
Chrome Extension
```

**Key Design Points:**
- MCP server runs as **separate process** (avoids stdio conflict)
- Uses existing WebSocket client (thin wrapper, no code duplication)
- Zero changes needed to browser-link-server or extension
- Multiple MCP servers can connect simultaneously

## Testing

### Manual Test

```bash
# Start browser-link-server (if not auto-started)
node native-host/browser-link-server.js

# In another terminal, test MCP server
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node mcp-server/index.js
```

Expected output:
```json
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"serverInfo":{"name":"chrome-link","version":"1.0.0"}}}
```

### Test Tool Invocation

```bash
# Create test file
cat > /tmp/test-mcp.json << 'EOF'
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"chrome_list_tabs","arguments":{}}}
EOF

# Run test
cat /tmp/test-mcp.json | node native-host/mcp-server.js 2>/dev/null
```

### Using MCP Inspector

```bash
npm install -g @modelcontextprotocol/inspector
npx @modelcontextprotocol/inspector node mcp-server/index.js
```

Opens web UI for testing tools interactively.

## Troubleshooting

### MCP Server Won't Connect

**Error**: `Failed to connect to browser-link-server`

**Solution**:
1. Check Chrome extension is installed: `chrome://extensions/`
2. Check browser-link-server is running: `curl http://localhost:9000/session` (expect `{"status":"ready","message":"Upgrade to WebSocket"}`)
3. Test WebSocket manually: `wscat -c ws://localhost:9000`

### Tools Not Showing in Claude

**Error**: Claude doesn't list Chrome tools

**Solution**:
1. Verify config file path is absolute (not relative)
2. Check JSON syntax: `python3 -m json.tool < ~/Library/Application\ Support/Claude/claude_desktop_config.json`
3. Restart Claude Desktop
4. Check Claude logs: `~/Library/Logs/Claude/`

### Tool Execution Fails

**Error**: `TypeError: tabId is not a number`

**Solution**:
1. Use `chrome_list_tabs` first to get valid tab IDs
2. Ensure tab still exists (not closed)
3. Check MCP server logs (stderr output)

## Logging

MCP server logs to **stderr** (stdout is reserved for MCP protocol):
- Connection status
- Tool invocations
- Errors and warnings

To see logs:
```bash
node native-host/mcp-server.js 2>&1 | grep "\[MCP Server\]"
```

## Security

⚠️ **MCP server has full browser control** - use with trusted AI agents only

Recommendations:
- Run in separate browser profile for automation
- Monitor AI agent actions via logs
- Disable MCP server when not needed
- Consider adding authentication for production use

## Documentation

- [MCP Server Configuration](../docs/dev/MCP_SERVER_CONFIGURATION.md) - Setup guide for various clients
- [ChromeLink Protocol](../docs/PROTOCOL.md) - WebSocket protocol specification
- [Node.js Client](../clients/node/README.md) - Client library used by MCP server

## License

MIT License - see [LICENSE](./LICENSE) file for details.

**Important Licensing Notice:**

This MCP server (`@aikeymouse/chromelink-mcp`) is licensed under the MIT License and can be used freely in both non-commercial and commercial projects.

However, this server connects to the **ChromeLink browser extension**, which uses dual licensing:

- **Non-Commercial Use**: Free under CC BY-NC-ND 4.0
  - Personal projects, education, research, open source (non-commercial)
  
- **Commercial Use**: Requires Commercial License
  - Commercial products, revenue-generating apps, business use, SaaS, client work
  - Contact: https://github.com/aikeymouse/chrome-link/issues

**Summary:** While this NPM package is MIT licensed, using it in a commercial application requires a ChromeLink commercial license.

See the main [ChromeLink LICENSE](https://github.com/aikeymouse/chrome-link/blob/main/LICENSE) for complete details.
