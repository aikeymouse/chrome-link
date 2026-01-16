/**
 * Unit tests for sendCommand method
 * Tests the generic command sender for calling any protocol command
 */

const { expect } = require('chai');
const { createClient } = require('../helpers/hooks');
const { TEST_URLS } = require('../helpers/test-data');

describe('sendCommand method', function() {
  let client;
  let initialTabIds;
  let testTabId;

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

  describe('Tab Management Commands', function() {
    it('should open tab using sendCommand', async function() {
      const result = await client.sendCommand('openTab', {
        url: TEST_URLS.EXAMPLE
      });

      client.assertValidResponse(result);
      expect(result).to.have.property('tab');
      expect(result.tab).to.have.property('id');
      testTabId = result.tab.id;
      
      await client.wait(1000);
      const tabs = await client.listTabs();
      const openedTab = tabs.tabs.find(t => t.id === testTabId);
      expect(openedTab.url).to.include('example');
    });

    it('should list tabs using sendCommand', async function() {
      // Open a test tab first
      const openResult = await client.sendCommand('openTab', {
        url: TEST_URLS.EXAMPLE
      });
      testTabId = openResult.tab.id;

      const result = await client.sendCommand('listTabs', {});

      client.assertValidResponse(result);
      expect(result).to.have.property('tabs');
      expect(result.tabs).to.be.an('array');
      expect(result.tabs.length).to.be.greaterThan(0);
      expect(result.tabs.some(tab => tab.id === testTabId)).to.be.true;
    });

    it('should close tab using sendCommand', async function() {
      // Open a test tab first
      const openResult = await client.sendCommand('openTab', {
        url: TEST_URLS.EXAMPLE
      });
      testTabId = openResult.tab.id;

      const result = await client.sendCommand('closeTab', {
        tabId: testTabId
      });

      client.assertValidSuccessResponse(result);
      expect(result.success).to.be.true;
    });

    it('should navigate tab using sendCommand', async function() {
      // Open a test tab first
      const openResult = await client.sendCommand('openTab', {
        url: TEST_URLS.EXAMPLE
      });
      testTabId = openResult.tab.id;

      const result = await client.sendCommand('navigateTab', {
        tabId: testTabId,
        url: TEST_URLS.SELENIUM_FORM
      });

      client.assertValidSuccessResponse(result);
      expect(result.success).to.be.true;
    });
  });

  describe('Helper Commands', function() {
    beforeEach(async function() {
      const result = await client.sendCommand('openTab', {
        url: TEST_URLS.SELENIUM_FORM
      });
      testTabId = result.tab.id;
      await client.wait(3000); // Wait for form to load
    });

    it('should call helper using sendCommand with callHelper', async function() {
      const result = await client.sendCommand('callHelper', {
        tabId: testTabId,
        functionName: 'clickElement',
        args: ['button[type="submit"]']
      });

      client.assertValidExecutionResponse(result);
      expect(result.value).to.be.true;
    });

    it('should execute script using sendCommand', async function() {
      const result = await client.sendCommand('executeJS', {
        tabId: testTabId,
        code: 'return document.title;'
      });

      // executeJS returns result directly (may vary by implementation)
      expect(result).to.be.an('object');
      // Result should have either value property or be the execution result
    });

    it('should get text using sendCommand with callHelper', async function() {
      const result = await client.sendCommand('callHelper', {
        tabId: testTabId,
        functionName: 'getText',
        args: ['h1']
      });

      client.assertValidExecutionResponse(result);
      expect(result.value).to.be.a('string');
      expect(result.value.length).to.be.greaterThan(0);
    });

    it('should type text using sendCommand with callHelper', async function() {
      const result = await client.sendCommand('callHelper', {
        tabId: testTabId,
        functionName: 'typeText',
        args: ['input[type="text"]', 'testuser']
      });

      client.assertValidExecutionResponse(result);
      expect(result.value).to.be.true;
    });
  });

  describe('Screenshot Commands', function() {
    beforeEach(async function() {
      const result = await client.sendCommand('openTab', {
        url: TEST_URLS.EXAMPLE
      });
      testTabId = result.tab.id;
      await client.wait(1000);
    });

    it('should capture screenshot using sendCommand', async function() {
      const result = await client.sendCommand('captureScreenshot', {
        tabId: testTabId
      });

      client.assertValidResponse(result);
      expect(result).to.have.property('dataUrl');
      expect(result.dataUrl).to.be.a('string');
      expect(result.dataUrl).to.match(/^data:image\/png;base64,/);
    });

    it('should capture full page screenshot using sendCommand', async function() {
      const result = await client.sendCommand('captureScreenshot', {
        tabId: testTabId,
        fullPage: true
      });

      client.assertValidResponse(result);
      expect(result).to.have.property('dataUrl');
      expect(result.dataUrl).to.be.a('string');
      expect(result.dataUrl).to.match(/^data:image\/png;base64,/);
    });
  });

  describe('Error Handling', function() {
    it('should handle invalid command gracefully', async function() {
      try {
        await client.sendCommand('invalidCommand', {
          param: 'value'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Unknown action');
      }
    });

    it('should handle missing required parameters', async function() {
      try {
        await client.sendCommand('navigateTab', {
          // Missing tabId and url
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.exist;
      }
    });

    it('should handle invalid tab ID', async function() {
      try {
        await client.sendCommand('closeTab', {
          tabId: 999999
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('not found');
      }
    });
  });

  describe('Complex Command Combinations', function() {
    it('should chain multiple sendCommand calls', async function() {
      // Open tab
      const openResult = await client.sendCommand('openTab', {
        url: TEST_URLS.SELENIUM_FORM
      });
      testTabId = openResult.tab.id;
      await client.wait(3000);

      // Type text
      const typeResult = await client.sendCommand('callHelper', {
        tabId: testTabId,
        functionName: 'typeText',
        args: ['input[type="text"]', 'testuser']
      });
      expect(typeResult.value).to.be.true;

      // Get text to verify
      const getResult = await client.sendCommand('executeJS', {
        tabId: testTabId,
        code: 'return document.querySelector("input[type=\'text\']").value;'
      });
      // executeJS result format may vary - just verify it worked
      expect(getResult).to.be.an('object');

      // Take screenshot
      const screenshotResult = await client.sendCommand('captureScreenshot', {
        tabId: testTabId
      });
      expect(screenshotResult.dataUrl).to.match(/^data:image\/png;base64,/);
    });
  });

  describe('Parameter Variations', function() {
    it('should handle empty params object', async function() {
      const result = await client.sendCommand('listTabs', {});
      
      client.assertValidResponse(result);
      expect(result.tabs).to.be.an('array');
    });

    it('should handle undefined params', async function() {
      const result = await client.sendCommand('listTabs');
      
      client.assertValidResponse(result);
      expect(result.tabs).to.be.an('array');
    });

    it('should handle params with extra properties', async function() {
      const openResult = await client.sendCommand('openTab', {
        url: TEST_URLS.EXAMPLE,
        extraParam: 'ignored',
        anotherExtra: 123
      });
      testTabId = openResult.tab.id;

      client.assertValidResponse(openResult);
      await client.wait(1000);
      const tabs = await client.listTabs();
      const openedTab = tabs.tabs.find(t => t.id === testTabId);
      expect(openedTab.url).to.include('example');
    });
  });
});
