# ChromePilot Test Suite

Comprehensive Mocha test suite for ChromePilot WebSocket automation.

## Prerequisites

1. **ChromePilot Server Running**
   ```bash
   # Server must be running on ws://localhost:9000
   # Check DEVELOPMENT.md for installation instructions
   ```

2. **Chrome Extension Loaded**
   - Extension must be installed and active
   - Side panel should show "Connected" status

3. **Node.js Dependencies**
   ```bash
   cd tests
   npm install
   ```

## Installation

Install test dependencies:

```bash
npm install
```

This installs:
- `mocha` - Test framework
- `chai` - Assertion library
- `chai-as-promised` - Promise assertions
- `ws` - WebSocket client

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Unit Tests Only
```bash
npm run test:unit
```

### Run Integration Tests Only
```bash
npm run test:integration
```

### Watch Mode
```bash
npm run test:watch
```

### Run Specific Test File
```bash
npx mocha unit/list-tabs.test.js
npx mocha integration/session-lifecycle.test.js
```

## Test Structure

```
tests/
├── unit/                      # Unit tests for individual commands
│   ├── list-tabs.test.js     # List tabs command
│   ├── open-tab.test.js      # Open tab command
│   ├── navigate-tab.test.js  # Navigate tab command
│   ├── switch-tab.test.js    # Switch tab command
│   ├── close-tab.test.js     # Close tab command
│   ├── execute-js.test.js    # Execute JavaScript command
│   └── call-helper.test.js   # Call helper function command
├── integration/               # Integration tests
│   ├── session-lifecycle.test.js   # Session creation/management
│   ├── chunked-responses.test.js   # Large data handling
│   ├── tab-events.test.js          # Tab state tracking
│   └── multi-command-flow.test.js  # Complex workflows
├── helpers/                   # Test utilities
│   ├── hooks.js              # Global hooks and client factory
│   ├── test-client.js        # Enhanced test client
│   └── fixtures.js           # Test data and constants
├── examples/                  # Example client scripts
│   ├── chromepilot-client.js # Base WebSocket client
│   ├── google-search-client.js
│   ├── test-client.js
│   └── test-client-new.js
└── .mocharc.json             # Mocha configuration
```

## Test Features

### Unit Tests
- Test individual commands in isolation
- Validate request/response format
- Error handling and edge cases
- Tab cleanup after each test
- TAB_NOT_FOUND error validation
- Timeout handling

### Integration Tests
- Session lifecycle management
- Multi-command workflows
- Chunked response handling (>1MB data)
- Tab event tracking
- Complex user scenarios

### Test Helpers
- `TestClient` - Enhanced client with helper methods
- `createClient()` - Factory for test clients
- `fixtures.js` - Test URLs and selectors
- Automatic tab cleanup
- Connection verification
- **Response validation helpers** - Standardized validation methods

### Response Validation

The `TestClient` provides validation helpers to ensure responses match protocol specifications:

#### `assertValidResponse(response, options)`
Comprehensive validation with configurable options:

```javascript
// Basic required field check
client.assertValidResponse(result, {
  requiredFields: ['tabs']
});

// Type validation
client.assertValidResponse(result, {
  requiredFields: ['tabs'],
  fieldTypes: { tabs: 'array' }
});

// Custom validation
client.assertValidResponse(result, {
  requiredFields: ['value'],
  customValidator: (response) => {
    if (response.value < 0) throw new Error('Value must be positive');
  }
});
```

**Options:**
- `requiredFields: Array<string>` - Fields that must exist in response
- `fieldTypes: Object` - Map of field names to expected types ('string', 'number', 'boolean', 'array', 'object')
- `customValidator: Function` - Custom validation function

#### Specialized Validators

**`assertValidTab(tab)`** - Validates tab object structure:
```javascript
const result = await client.sendRequest('openTab', { url: TEST_URLS.EXAMPLE });
client.assertValidTab(result.tab);
// Validates: id (number), url (string), title (string), active (boolean)
```

**`assertValidSuccessResponse(response)`** - Validates success responses:
```javascript
const result = await client.closeTab(tabId);
client.assertValidSuccessResponse(result);
// Validates: success field exists and equals true
```

**`assertValidExecutionResponse(response)`** - Validates execution results:
```javascript
const result = await client.executeJS('2 + 2', tabId);
client.assertValidExecutionResponse(result);
// Validates: value field exists (any type)
expect(result.value).to.equal(4);
```

## Writing Tests

### Basic Unit Test Template

```javascript
const { expect } = require('chai');
const { createClient } = require('../helpers/hooks');

describe('Command Name', function() {
  let client;
  let initialTabIds;

  before(async function() {
    client = createClient();
    await client.connect();
    await client.waitForConnection();
  });

  after(function() {
    if (client) {
      client.close();
    }
  });

  beforeEach(async function() {
    initialTabIds = await client.getInitialTabIds();
  });

  afterEach(async function() {
    await client.cleanupTabs(initialTabIds);
  });

  it('should do something', async function() {
    const result = await client.sendRequest('commandName', { params });
    
    // Validate response structure
    client.assertValidResponse(result, {
      requiredFields: ['field1', 'field2'],
      fieldTypes: { field1: 'string', field2: 'number' }
    });
    
    // Additional assertions
    expect(result.field1).to.equal('expected value');
  });
    const result = await client.sendRequest('action', { params });
    expect(result).to.have.property('expectedField');
  });
});
```

### Integration Test Template

```javascript
const { expect } = require('chai');
const { createClient } = require('../helpers/hooks');
const { TEST_URLS } = require('../helpers/fixtures');

describe('Workflow Name', function() {
  let client;
  let initialTabIds;

  before(async function() {
    client = createClient();
    await client.connect();
    await client.waitForConnection();
  });

  after(function() {
    if (client) {
      client.close();
    }
  });

  beforeEach(async function() {
    initialTabIds = await client.getInitialTabIds();
  });

  afterEach(async function() {
    await client.cleanupTabs(initialTabIds);
  });

  it('should complete workflow', async function() {
    // Multi-step test
  });
});
```

## Test Data

Test URLs defined in `helpers/fixtures.js`:
- `TEST_URLS.EXAMPLE` - http://example.com
- `TEST_URLS.SELENIUM_FORM` - Selenium web form for interaction tests
- `TEST_URLS.HTTPBIN` - HTTP testing service

## Troubleshooting

### Tests Hang or Timeout
- Verify ChromePilot server is running on ws://localhost:9000
- Check Chrome extension is loaded and connected
- Increase timeout in `.mocharc.json` if needed

### Connection Errors
- Ensure no firewall blocking localhost:9000
- Check server logs in `native-host/logs/`
- Verify extension ID matches in native-host manifest

### Tab Cleanup Issues
- Tests automatically clean up created tabs
- If tabs persist, manually close them before re-running
- Check afterEach hooks are executing

### Random Failures
- Some tests depend on page load timing
- Increase wait times in test if pages load slowly
- Check network connectivity for external URLs

## CI/CD Integration

Run tests in CI with validation script:

```bash
# From tests directory
./run-tests.sh
```

This script:
1. Validates server is running
2. Checks extension is loaded
3. Runs complete test suite
4. Reports results

## Contributing

When adding new tests:
1. Place unit tests in `unit/`
2. Place integration tests in `integration/`
3. Follow existing naming: `command-name.test.js`
4. Include error handling tests
5. Clean up resources in afterEach
6. Update this README with new test descriptions

## TODO

### Future Enhancements

1. **CSP Test Server**
   - Create local test server serving pages with various CSP headers
   - Validate helper injection works on CSP-restricted pages
   - Test different CSP policy combinations

2. **Performance Benchmarks**
   - Add `tests/performance/` directory
   - Measure command latency
   - Analyze chunking overhead
   - Track session creation time
   - Test concurrent connection limits
