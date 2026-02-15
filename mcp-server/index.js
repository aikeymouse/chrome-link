#!/usr/bin/env node

/**
 * ChromeLink MCP Server
 * 
 * Model Context Protocol (MCP) server that exposes Chrome browser automation
 * capabilities to AI agents like Claude, GPT, etc.
 * 
 * This server uses the official @modelcontextprotocol/sdk package for
 * standards-compliant MCP protocol implementation.
 * 
 * Architecture:
 *   AI Agent (Claude/GPT) <-> MCP Server (this file) <-> browser-link-server <-> Chrome Extension
 *   
 * Communication:
 *   - AI Agent ↔ MCP Server: stdio (MCP protocol via SDK)
 *   - MCP Server ↔ browser-link-server: WebSocket (ws://localhost:9000)
 *   
 * Usage:
 *   node mcp-server.js
 *   
 * Configuration (Claude Desktop):
 *   Add to ~/Library/Application Support/Claude/claude_desktop_config.json:
 *   {
 *     "mcpServers": {
 *       "chrome-link": {
 *         "command": "node",
 *         "args": ["/path/to/chrome-driver-extension/mcp-server/index.js"]
 *       }
 *     }
 *   }
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema 
} from "@modelcontextprotocol/sdk/types.js";
import { createRequire } from 'module';

// Import CommonJS modules
const require = createRequire(import.meta.url);
const ChromeLinkClient = require('@aikeymouse/chromelink-client');
const packageJson = require('./package.json');

// Global ChromeLink client instance
let client = null;

/**
 * Log to stderr (stdout is reserved for MCP protocol)
 */
function log(message, ...args) {
  console.error(`[MCP Server] ${message}`, ...args);
}

/**
 * Initialize connection to browser-link-server
 */
async function initializeClient() {
  try {
    client = new ChromeLinkClient({ verbose: false });
    await client.connect('ws://localhost:9000');
    log('Connected to browser-link-server');
    
    // Handle WebSocket disconnection - log but don't exit
    // Server will attempt to reconnect on next tool call
    client.ws.on('close', () => {
      log('WebSocket connection closed (session may have expired)');
      client = null;
    });
    
    client.ws.on('error', (err) => {
      log('WebSocket error:', err.message);
    });
  } catch (error) {
    log('Failed to connect to browser-link-server:', error.message);
    throw error;
  }
}

/**
 * Ensure connection is active, reconnect if needed
 */
async function ensureConnected() {
  if (!client || !client.ws || client.ws.readyState !== 1) {
    log('Reconnecting to browser-link-server...');
    await initializeClient();
  }
}

/**
 * Get list of available MCP tools
 */
function getTools() {
  return [
    // Tab Management
    {
      name: 'chrome_list_tabs',
      description: 'List all open tabs in the browser',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      }
    },
    {
      name: 'chrome_open_tab',
      description: 'Open a new tab with the specified URL',
      inputSchema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'URL to open in the new tab'
          },
          focus: {
            type: 'boolean',
            description: 'Whether to focus the new tab (default: true)',
            default: true
          }
        },
        required: ['url']
      }
    },
    {
      name: 'chrome_navigate_tab',
      description: 'Navigate an existing tab to a new URL',
      inputSchema: {
        type: 'object',
        properties: {
          tabId: {
            type: 'number',
            description: 'ID of the tab to navigate'
          },
          url: {
            type: 'string',
            description: 'URL to navigate to'
          },
          focus: {
            type: 'boolean',
            description: 'Whether to focus the tab (default: true)',
            default: true
          }
        },
        required: ['tabId', 'url']
      }
    },
    {
      name: 'chrome_switch_tab',
      description: 'Switch to (focus) a specific tab',
      inputSchema: {
        type: 'object',
        properties: {
          tabId: {
            type: 'number',
            description: 'ID of the tab to switch to'
          }
        },
        required: ['tabId']
      }
    },
    {
      name: 'chrome_close_tab',
      description: 'Close a specific tab',
      inputSchema: {
        type: 'object',
        properties: {
          tabId: {
            type: 'number',
            description: 'ID of the tab to close'
          }
        },
        required: ['tabId']
      }
    },
    {
      name: 'chrome_get_active_tab',
      description: 'Get information about the currently active tab',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      }
    },

    // Navigation History
    {
      name: 'chrome_go_back',
      description: 'Navigate back in tab history (only works after user navigation, not programmatic)',
      inputSchema: {
        type: 'object',
        properties: {
          tabId: {
            type: 'number',
            description: 'ID of the tab to navigate back'
          }
        },
        required: ['tabId']
      }
    },
    {
      name: 'chrome_go_forward',
      description: 'Navigate forward in tab history (only works after user navigation, not programmatic)',
      inputSchema: {
        type: 'object',
        properties: {
          tabId: {
            type: 'number',
            description: 'ID of the tab to navigate forward'
          }
        },
        required: ['tabId']
      }
    },

    // DOM Interaction
    {
      name: 'chrome_wait_for_element',
      description: 'Wait for an element matching the CSS selector to appear on the page',
      inputSchema: {
        type: 'object',
        properties: {
          selector: {
            type: 'string',
            description: 'CSS selector for the element'
          },
          tabId: {
            type: 'number',
            description: 'ID of the tab'
          },
          timeout: {
            type: 'number',
            description: 'Maximum time to wait in milliseconds (default: 5000)',
            default: 5000
          }
        },
        required: ['selector', 'tabId']
      }
    },
    {
      name: 'chrome_get_text',
      description: 'Get the text content of an element matching the CSS selector',
      inputSchema: {
        type: 'object',
        properties: {
          selector: {
            type: 'string',
            description: 'CSS selector for the element'
          },
          tabId: {
            type: 'number',
            description: 'ID of the tab'
          }
        },
        required: ['selector', 'tabId']
      }
    },
    {
      name: 'chrome_click',
      description: 'Click an element matching the CSS selector',
      inputSchema: {
        type: 'object',
        properties: {
          selector: {
            type: 'string',
            description: 'CSS selector for the element to click'
          },
          tabId: {
            type: 'number',
            description: 'ID of the tab'
          }
        },
        required: ['selector', 'tabId']
      }
    },
    {
      name: 'chrome_type',
      description: 'Type text into an element matching the CSS selector',
      inputSchema: {
        type: 'object',
        properties: {
          selector: {
            type: 'string',
            description: 'CSS selector for the input element'
          },
          text: {
            type: 'string',
            description: 'Text to type into the element'
          },
          tabId: {
            type: 'number',
            description: 'ID of the tab'
          }
        },
        required: ['selector', 'text', 'tabId']
      }
    },

    // JavaScript Execution
    {
      name: 'chrome_execute_js',
      description: 'Execute arbitrary JavaScript code in the page context',
      inputSchema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'JavaScript code to execute'
          },
          tabId: {
            type: 'number',
            description: 'ID of the tab'
          }
        },
        required: ['code', 'tabId']
      }
    },
    {
      name: 'chrome_call_helper',
      description: 'Call a predefined DOM helper functions that works for CSP-restricted pages too. Available helpers: Element Interaction (clickElement, typeText, appendChar, clearContentEditable), Element Query (getText, getHTML, getLastHTML, elementExists, isVisible, waitForElement), Element Highlighting (highlightElement, removeHighlights), Element Positioning (getElementBounds, scrollElementIntoView), Element Inspection (inspectElement, getContainerElements, extractPageElements)',
      inputSchema: {
        type: 'object',
        properties: {
          functionName: {
            type: 'string',
            description: 'Name of the helper function',
            enum: [
              'clickElement', 
              'typeText', 
              'appendChar', 
              'clearContentEditable',
              'getText', 
              'getHTML', 
              'getLastHTML', 
              'elementExists', 
              'isVisible', 
              'waitForElement',
              'highlightElement', 
              'removeHighlights',
              'getElementBounds', 
              'scrollElementIntoView',
              'inspectElement', 
              'getContainerElements',
              'extractPageElements'
            ]
          },
          args: {
            type: 'array',
            description: 'Arguments to pass to the helper function (as individual parameters, not objects)',
            items: {
              oneOf: [
                { type: 'string' },
                { type: 'number' },
                { type: 'boolean' },
                { type: 'null' }
              ]
            }
          },
          tabId: {
            type: 'number',
            description: 'ID of the tab'
          }
        },
        required: ['functionName', 'args', 'tabId']
      }
    },

    // Screenshots
    {
      name: 'chrome_capture_screenshot',
      description: 'Capture a screenshot of the current tab',
      inputSchema: {
        type: 'object',
        properties: {
          format: {
            type: 'string',
            description: 'Image format (png or jpeg)',
            enum: ['png', 'jpeg'],
            default: 'png'
          },
          quality: {
            type: 'number',
            description: 'JPEG quality (0-100, only for jpeg format)',
            minimum: 0,
            maximum: 100,
            default: 90
          }
        },
        required: []
      }
    },

    // Script Injection
    {
      name: 'chrome_register_injection',
      description: 'Register a content script to be injected into matching pages',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique identifier for this injection'
          },
          code: {
            type: 'string',
            description: 'JavaScript code to inject'
          },
          matches: {
            type: 'array',
            description: 'URL patterns to match (e.g., ["https://*.example.com/*"])',
            items: {
              type: 'string'
            }
          },
          runAt: {
            type: 'string',
            description: 'When to inject the script',
            enum: ['document_start', 'document_end', 'document_idle'],
            default: 'document_idle'
          }
        },
        required: ['id', 'code', 'matches']
      }
    },
    {
      name: 'chrome_unregister_injection',
      description: 'Unregister a previously registered content script',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID of the injection to unregister'
          }
        },
        required: ['id']
      }
    }
  ];
}

/**
 * Handle tool invocation
 */
async function handleToolCall(name, args) {
  log(`Tool call: ${name}`, args);

  try {
    // Ensure connection is active before executing tool
    await ensureConnected();
    
    let result;

    switch (name) {
      // Tab Management
      case 'chrome_list_tabs':
        result = await client.listTabs();
        break;

      case 'chrome_open_tab':
        result = await client.openTab(args.url, args.focus);
        break;

      case 'chrome_navigate_tab':
        result = await client.navigateTab(args.tabId, args.url, args.focus);
        break;

      case 'chrome_switch_tab':
        result = await client.switchTab(args.tabId);
        break;

      case 'chrome_close_tab':
        result = await client.closeTab(args.tabId);
        break;

      case 'chrome_get_active_tab':
        result = await client.getActiveTab();
        break;

      // Navigation History
      case 'chrome_go_back':
        result = await client.goBack(args.tabId);
        break;

      case 'chrome_go_forward':
        result = await client.goForward(args.tabId);
        break;

      // DOM Interaction
      case 'chrome_wait_for_element':
        result = await client.waitForElement(args.selector, args.timeout || 5000, args.tabId);
        break;

      case 'chrome_get_text':
        result = await client.getText(args.selector, args.tabId);
        break;

      case 'chrome_click':
        result = await client.click(args.selector, args.tabId);
        break;

      case 'chrome_type':
        result = await client.type(args.selector, args.text, args.tabId);
        break;

      // JavaScript Execution
      case 'chrome_execute_js':
        result = await client.executeJS(args.code, args.tabId);
        break;

      case 'chrome_call_helper':
        // Validate that args array contains only primitives, not objects
        if (args.args && Array.isArray(args.args)) {
          for (let i = 0; i < args.args.length; i++) {
            const arg = args.args[i];
            if (arg !== null && typeof arg === 'object') {
              throw new Error(`Invalid argument at index ${i}: expected primitive type (string, number, boolean, null), got object. Use individual parameters like ["form", false], not [{"containerSelector": "form"}]`);
            }
          }
        }
        result = await client.callHelper(args.functionName, args.args, args.tabId);
        break;

      // Screenshots
      case 'chrome_capture_screenshot':
        result = await client.captureScreenshot({
          format: args.format || 'png',
          quality: args.quality || 90
        });
        break;

      // Script Injection
      case 'chrome_register_injection':
        result = await client.registerInjection(
          args.id,
          args.code,
          args.matches,
          args.runAt || 'document_idle'
        );
        break;

      case 'chrome_unregister_injection':
        result = await client.unregisterInjection(args.id);
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    log(`Tool result for ${name}:`, result);
    return result;

  } catch (error) {
    log(`Tool error for ${name}:`, error.message);
    throw error;
  }
}

/**
 * Main server initialization
 */
async function main() {
  log('Starting MCP server with official SDK...');

  // Connect to browser-link-server
  await initializeClient();

  // Create MCP Server instance
  const server = new Server({
    name: 'chrome-link',
    version: packageJson.version
  }, {
    capabilities: {
      tools: {}
    }
  });

  // Register tools/list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: getTools()
    };
  });

  // Register tools/call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    try {
      const result = await handleToolCall(name, args || {});
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      log(`Error handling tool call ${name}:`, error.message);
      throw error;
    }
  });

  // Handle process signals for graceful shutdown
  process.on('SIGINT', async () => {
    log('Received SIGINT, shutting down...');
    if (client) {
      client.close();
    }
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    log('Received SIGTERM, shutting down...');
    if (client) {
      client.close();
    }
    await server.close();
    process.exit(0);
  });

  // Connect transport and start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  log('MCP server started successfully with SDK');
}

// Run the server
main().catch((error) => {
  console.error('[MCP Server] Fatal error:', error);
  process.exit(1);
});

