# ChromePilot Test Suite

Complete test suite for ChromePilot extension with unit, integration, and UI tests.

## Test Structure

```
tests/
├── unit/                    # Unit tests (isolated component tests)
│   ├── list-tabs.test.js
│   ├── open-tab.test.js
│   ├── navigate-tab.test.js
│   ├── switch-tab.test.js
│   ├── close-tab.test.js
│   └── execute-js.test.js
│
├── integration/             # Integration tests (full stack)
│   ├── session-lifecycle.test.js
│   ├── chunked-responses.test.js
│   ├── tab-events.test.js
│   ├── multi-command-flow.test.js
│   └── call-helper.test.js
│
├── ui/                      # UI tests (Playwright)
│   ├── sidepanel.spec.js
│   ├── global-setup.js
│   └── global-teardown.js
│
├── helpers/                 # Shared test utilities
│   ├── test-client.js       # Enhanced test client
│   ├── hooks.js             # Global test hooks
│   ├── fixtures.js          # Test fixtures and constants
│   ├── server-helper.js     # Server lifecycle management
│   └── session-helper.js    # Session utilities
│
└── examples/                # Example clients and documentation
```

## Running Tests

### All Tests (Sequential)
```bash
npm test
```

This runs all test suites in sequence:
1. Unit tests
2. Integration tests  
3. UI tests

### Individual Test Suites

**Unit Tests Only:**
```bash
npm run test:unit
```

**Integration Tests Only:**
```bash
npm run test:integration
```

**UI Tests Only:**
```bash
npm run test:ui
```

### Watch Mode

**Unit Tests (Watch):**
```bash
npm run test:unit:watch
```

**Integration Tests (Watch):**
```bash
npm run test:integration:watch
```

## Prerequisites

### For Unit & Integration Tests
- Native host server running (or tests will start it)
- Chrome extension loaded
- Node.js dependencies installed

### For UI Tests
- Playwright installed
- Chrome browser
- Extension built and available at `../extension`

## Installation

```bash
# Install dependencies
cd tests
npm install

# Install Playwright browsers (first time only)
npx playwright install chromium
```

## Test Types

### Unit Tests
Fast, isolated tests for individual commands:
- `listTabs` - Tab listing functionality
- `openTab` - Tab creation
- `navigateTab` - URL navigation
- `switchTab` - Tab activation
- `closeTab` - Tab closure
- `executeJS` - JavaScript execution

**Duration:** ~5-10 seconds

### Integration Tests
Full stack tests requiring WebSocket + Extension:
- Session lifecycle (creation, expiration, reconnection)
- Large data handling (chunked responses)
- Tab event broadcasting
- Multi-command workflows
- DOM helper functions

**Duration:** ~20-30 seconds

### UI Tests
Browser-based tests with extension loaded:
- Sidepanel rendering
- Material Symbols icons
- Interactive elements (buttons, inputs)
- Section toggling
- Empty states

**Duration:** ~15-25 seconds

## Test Configuration

### Mocha (.mocharc.json)
- Timeout: 60 seconds
- Reporter: spec
- Require: chai-as-promised

### Playwright (playwright.config.js)
- Workers: 1 (sequential execution)
- Retries: 0 (local), 2 (CI)
- Screenshots: on failure
- Video: on failure
- Global setup/teardown for server

## Writing New Tests

### Unit Test Example
```javascript
const { expect } = require('chai');
const TestClient = require('../helpers/test-client');

describe('My Command', function() {
  let client;

  before(async function() {
    client = new TestClient();
    await client.connect();
  });

  after(async function() {
    await client.disconnect();
  });

  it('should do something', async function() {
    const result = await client.myCommand();
    expect(result).to.be.an('object');
  });
});
```

### UI Test Example
```javascript
const { test, expect } = require('@playwright/test');

test('should display element', async ({ page }) => {
  await page.goto(`chrome-extension://${extensionId}/page.html`);
  const element = page.locator('#my-element');
  await expect(element).toBeVisible();
});
```

## Shared Helpers

### ServerHelper
Manages native host server lifecycle:
```javascript
const ServerHelper = require('./helpers/server-helper');
const server = new ServerHelper();

await server.start();  // Start server
await server.stop();   // Stop server
server.isRunning();    // Check status
```

### SessionHelper
Common session operations:
```javascript
const { createTestSession, wait, cleanupSession } = require('./helpers/session-helper');

const sessionId = await createTestSession(client, 60000);
await wait(1000);
await cleanupSession(client);
```

### TestClient
Enhanced client with assertions:
```javascript
const TestClient = require('./helpers/test-client');
const client = new TestClient();

await client.connect();
await client.assertTabExists(tabId);
await client.assertElementVisible(selector);
```

## Troubleshooting

### Tests Fail to Connect
- Ensure native host server is running
- Check Chrome extension is loaded
- Verify port 9000 is available

### UI Tests Can't Find Extension
- Build extension first: `cd extension && npm run build`
- Check EXTENSION_PATH in test file
- Ensure Chrome is installed

### Tests Timeout
- Increase timeout in test file
- Check network connectivity
- Verify extension is responding

## CI/CD

Tests run sequentially in CI:
```yaml
# Example GitHub Actions
- run: npm run test:unit
- run: npm run test:integration
- run: npm run test:ui
```

Sequential execution prevents:
- Port conflicts
- Resource contention
- Race conditions

## Coverage

Current test coverage:
- **Unit Tests:** 6 files, ~60 assertions
- **Integration Tests:** 5 files, ~50 assertions
- **UI Tests:** 1 file, ~40 assertions

**Total:** 12 test files, ~150 assertions

## Contributing

When adding new tests:
1. Place in appropriate directory (unit/integration/ui)
2. Use shared helpers for common operations
3. Follow existing naming conventions
4. Add JSDoc comments
5. Update this README if adding new patterns
