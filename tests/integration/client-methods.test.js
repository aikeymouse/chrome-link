/**
 * Integration tests for ChromeLinkClient methods
 * Tests all client wrapper methods including tab management, navigation, DOM interaction, and utilities
 */

const { expect } = require('chai');
const ChromeLinkClient = require('../../clients/node/index');
const { TEST_URLS } = require('../helpers/test-data');

describe('Client Methods Integration Tests', function() {
  this.timeout(30000); // Increase timeout for browser operations
  
  let client;
  let testTabId;

  beforeEach(async function() {
    client = new ChromeLinkClient({ verbose: false });
    await client.connect();
  });

  afterEach(async function() {
    // Clean up test tab if it exists
    if (testTabId) {
      try {
        await client.closeTab(testTabId);
      } catch (err) {
        // Tab might already be closed
      }
      testTabId = null;
    }
    
    if (client) {
      client.close();
    }
  });

  describe('Tab Management', function() {
    it('should list tabs', async function() {
      const result = await client.listTabs();
      
      expect(result).to.have.property('tabs');
      expect(result).to.have.property('windowId');
      expect(result.tabs).to.be.an('array');
      expect(result.tabs.length).to.be.at.least(1);
      
      const tab = result.tabs[0];
      expect(tab).to.have.property('id');
      expect(tab).to.have.property('url');
      expect(tab).to.have.property('title');
    });

    it('should open a new tab', async function() {
      const result = await client.openTab(TEST_URLS.EXAMPLE);
      
      expect(result).to.have.property('tab');
      expect(result.tab).to.have.property('id');
      
      testTabId = result.tab.id;
      
      // Wait for navigation to complete
      await client.wait(2000);
      
      // Verify URL after navigation
      const urlCheck = await client.executeJS('window.location.href', testTabId);
      expect(urlCheck.value).to.include('example.com');
    });

    it('should navigate an existing tab', async function() {
      // Open initial tab
      const openResult = await client.openTab(TEST_URLS.EXAMPLE);
      testTabId = openResult.tab.id;
      await client.wait(2000);
      
      // Navigate to new URL
      const navResult = await client.navigateTab(testTabId, TEST_URLS.HTTPBIN);
      
      expect(navResult).to.have.property('success', true);
      expect(navResult).to.have.property('tabId', testTabId);
      
      await client.wait(2000);
      
      // Verify URL changed
      const urlCheck = await client.executeJS('window.location.href', testTabId);
      expect(urlCheck.value).to.include('httpbin.org');
    });

    it('should switch to a tab', async function() {
      // Open a new tab
      const result = await client.openTab(TEST_URLS.EXAMPLE);
      testTabId = result.tab.id;
      
      // Switch to it
      const switchResult = await client.switchTab(testTabId);
      
      expect(switchResult).to.have.property('success', true);
      expect(switchResult).to.have.property('tabId', testTabId);
    });

    it('should close a tab', async function() {
      // Open a tab
      const openResult = await client.openTab(TEST_URLS.EXAMPLE);
      const tabId = openResult.tab.id;
      
      // Close it
      const closeResult = await client.closeTab(tabId);
      
      expect(closeResult).to.have.property('success', true);
      expect(closeResult).to.have.property('tabId', tabId);
      
      testTabId = null; // Already closed
    });

    it('should get active tab', async function() {
      // Open and focus a tab
      const result = await client.openTab(TEST_URLS.EXAMPLE, true);
      testTabId = result.tab.id;
      await client.wait(500);
      
      // Get active tab
      const activeTab = await client.getActiveTab();
      
      expect(activeTab).to.not.be.null;
      expect(activeTab).to.have.property('id');
      expect(activeTab).to.have.property('active', true);
    });
  });

  describe('Navigation History', function() {
    // Note: goBack/goForward have Chrome limitations after programmatic navigation
    // They work after user clicks or when using openTab (not navigateTab)
    it.skip('should navigate back in history', async function() {
      // Open tab with first URL
      const result = await client.openTab(TEST_URLS.EXAMPLE);
      testTabId = result.tab.id;
      await client.wait(3000);
      
      // Wait for page to fully load
      await client.waitForElement('body', 5000, testTabId);
      
      // Create history by setting location via JS (avoids address bar focus)
      await client.executeJS('window.location.href = "https://httpbin.org"', testTabId);
      await client.wait(4000);
      
      // Wait for second page to load
      await client.waitForElement('body', 5000, testTabId);
      
      // Go back
      const backResult = await client.goBack(testTabId);
      
      expect(backResult).to.have.property('success', true);
      expect(backResult).to.have.property('tabId', testTabId);
      
      await client.wait(2000);
      
      // Verify we went back to example.com
      const urlCheck = await client.executeJS('window.location.href', testTabId);
      expect(urlCheck.value).to.include('example.com');
    });

    it.skip('should navigate forward in history', async function() {
      // Open tab and create history
      const result = await client.openTab(TEST_URLS.EXAMPLE);
      testTabId = result.tab.id;
      await client.wait(3000);
      
      // Wait for page to fully load
      await client.waitForElement('body', 5000, testTabId);
      
      // Navigate via JS to create history
      await client.executeJS('window.location.href = "https://httpbin.org"', testTabId);
      await client.wait(4000);
      
      // Wait for second page to load
      await client.waitForElement('body', 5000, testTabId);
      
      // Go back
      await client.goBack(testTabId);
      await client.wait(2000);
      
      // Go forward
      const forwardResult = await client.goForward(testTabId);
      
      expect(forwardResult).to.have.property('success', true);
      expect(forwardResult).to.have.property('tabId', testTabId);
      
      await client.wait(2000);
      
      // Verify we're back at httpbin.org
      const urlCheck = await client.executeJS('window.location.href', testTabId);
      expect(urlCheck.value).to.include('httpbin.org');
    });

    it('should return success false when cannot go back', async function() {
      // Open fresh tab
      const result = await client.openTab(TEST_URLS.EXAMPLE);
      testTabId = result.tab.id;
      await client.wait(2000);
      
      // Try to go back with no history
      const backResult = await client.goBack(testTabId);
      
      expect(backResult).to.have.property('success', false);
      expect(backResult).to.have.property('message');
    });
  });

  describe('JavaScript Execution', function() {
    beforeEach(async function() {
      const result = await client.openTab(TEST_URLS.EXAMPLE);
      testTabId = result.tab.id;
      await client.wait(2000);
    });

    it('should execute simple JavaScript', async function() {
      const result = await client.executeJS('2 + 2', testTabId);
      
      expect(result).to.have.property('value', 4);
      expect(result).to.have.property('type', 'number');
    });

    it('should execute JavaScript returning string', async function() {
      const result = await client.executeJS('document.title', testTabId);
      
      expect(result).to.have.property('value');
      expect(result).to.have.property('type', 'string');
      expect(result.value).to.be.a('string');
    });

    it('should execute JavaScript returning object', async function() {
      const result = await client.executeJS('({foo: "bar", num: 42})', testTabId);
      
      expect(result).to.have.property('value');
      expect(result).to.have.property('type', 'object');
      expect(result.value).to.deep.equal({ foo: 'bar', num: 42 });
    });

    it('should execute JavaScript returning array', async function() {
      const result = await client.executeJS('[1, 2, 3]', testTabId);
      
      expect(result).to.have.property('value');
      expect(result).to.have.property('type', 'object');
      expect(result.value).to.deep.equal([1, 2, 3]);
    });
  });

  describe('DOM Interaction', function() {
    beforeEach(async function() {
      const result = await client.openTab(TEST_URLS.SELENIUM_FORM);
      testTabId = result.tab.id;
      await client.wait(2000);
    });

    it('should wait for element to appear', async function() {
      const result = await client.waitForElement('h1', 10000, testTabId);
      
      expect(result).to.have.property('found', true);
    });

    it('should throw error if element not found within timeout', async function() {
      try {
        await client.waitForElement('div.nonexistent-element-12345', 2000, testTabId);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err.message).to.include('not found');
      }
    });

    it('should get text from element', async function() {
      await client.waitForElement('h1.display-6', 10000, testTabId);
      const result = await client.getText('h1.display-6', testTabId);

      expect(result).to.equal('Web form');     
    });

    it('should click element', async function() {
      const result = await client.click('button[type="submit"]', testTabId);
      expect(result).to.have.property('value', true);      
    });

    it('should type text into input', async function() {
      
      
      // Type into it
      const testText = 'Hello World';
      await client.type('#my-text-id', testText, testTabId);
      
      await client.wait(1000);
      
      // Verify value
      const value = await client.executeJS('document.querySelector("#my-text-id").value', testTabId);
      expect(value.value).to.equal(testText);
    });
  });

  describe('Helper Functions', function() {
    beforeEach(async function() {
      const result = await client.openTab(TEST_URLS.EXAMPLE);
      testTabId = result.tab.id;
      await client.wait(2000);
    });

    it('should call helper function with no arguments', async function() {
      await client.waitForElement('h1', 10000, testTabId);
      const result = await client.callHelper('elementExists', ['h1'], testTabId);
      
      expect(result).to.have.property('value');
      expect(result.value).to.equal(true);
    });

    it('should call helper function with arguments', async function() {
      await client.waitForElement('h1', 10000, testTabId);
      const result = await client.callHelper('getText', ['h1'], testTabId);
      
      expect(result).to.have.property('value');
      expect(result.value).to.be.a('string');
      expect(result.value.length).to.be.at.least(1);
    });

    it('should call elementExists helper', async function() {
      const exists = await client.callHelper('elementExists', ['h1'], testTabId);
      expect(exists.value).to.equal(true);
      
      const notExists = await client.callHelper('elementExists', ['div.nonexistent-12345'], testTabId);
      expect(notExists.value).to.equal(false);
    });
  });

  describe('Screenshots', function() {
    beforeEach(async function() {
      const result = await client.openTab(TEST_URLS.EXAMPLE);
      testTabId = result.tab.id;
      await client.wait(2000);
    });

    it('should capture screenshot with default options', async function() {
      const result = await client.captureScreenshot({ tabId: testTabId });
      
      expect(result).to.have.property('dataUrl');
      expect(result.dataUrl).to.be.a('string');
      expect(result.dataUrl).to.include('data:image/');
    });

    it('should capture PNG screenshot', async function() {
      const result = await client.captureScreenshot({ 
        tabId: testTabId,
        format: 'png' 
      });
      
      expect(result).to.have.property('dataUrl');
      expect(result.dataUrl).to.include('data:image/png');
    });

    it('should capture JPEG screenshot', async function() {
      const result = await client.captureScreenshot({ 
        tabId: testTabId,
        format: 'jpeg',
        quality: 80
      });
      
      expect(result).to.have.property('dataUrl');
      expect(result.dataUrl).to.include('data:image/jpeg');
    });
  });

  describe('Script Injection', function() {
    it('should register script injection', async function() {
      const result = await client.registerInjection(
        'test-injection',
        'window.testInjected = true;',
        ['https://example.com/*'],
        'document_start'
      );
      
      expect(result).to.have.property('registered', true);
      expect(result).to.have.property('id', 'test-injection');
      
      // Clean up
      await client.unregisterInjection('test-injection');
    });

    it('should unregister script injection', async function() {
      // Register first
      await client.registerInjection(
        'test-injection-2',
        'window.testInjected2 = true;',
        ['https://example.com/*']
      );
      
      // Unregister
      const result = await client.unregisterInjection('test-injection-2');
      
      expect(result).to.have.property('unregistered', true);
      expect(result).to.have.property('id', 'test-injection-2');
    });
  });

  describe('Utility Methods', function() {
    it('should wait for specified time', async function() {
      const start = Date.now();
      await client.wait(1000);
      const elapsed = Date.now() - start;
      
      expect(elapsed).to.be.at.least(950); // Allow small variance
      expect(elapsed).to.be.at.most(1200);
    });

    it('should send generic command', async function() {
      const result = await client.sendCommand('listTabs');
      
      expect(result).to.have.property('tabs');
      expect(result.tabs).to.be.an('array');
    });

    it('should close session gracefully', async function() {
      const result = await client.closeSession();
      
      expect(result).to.have.property('closed', true);
    });
  });

  describe('Error Handling', function() {
    beforeEach(async function() {
      const result = await client.openTab(TEST_URLS.EXAMPLE);
      testTabId = result.tab.id;
      await client.wait(2000);
    });

    it('should handle JavaScript execution errors', async function() {
      try {
        await client.executeJS('throw new Error("Test error")', testTabId);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.exist;
      }
    });

    it('should handle click on non-existent element', async function() {
      try {
        await client.click('div.nonexistent-element-12345', testTabId);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.exist;
      }
    });

    it('should handle getText on non-existent element', async function() {
      try {
        await client.getText('div.nonexistent-element-12345', testTabId);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.exist;
      }
    });

    it('should handle type on non-existent element', async function() {
      try {
        await client.type('input.nonexistent-12345', 'test', testTabId);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.exist;
      }
    });
  });

  describe('Complex Workflows', function() {
    it('should handle multi-step form interaction', async function() {
      // Open tab with form
      const result = await client.openTab(TEST_URLS.SELENIUM_FORM);
      testTabId = result.tab.id;
      await client.wait(2000);
      
      // Wait for form to load
      await client.waitForElement('form', 10000, testTabId);
      
      // Fill in text input
      await client.type('#my-text-id', 'John Doe', testTabId);
      await client.wait(300);
      
      // Fill in password
      await client.type('input[type="password"]', 'SecurePass123', testTabId);
      await client.wait(300);
      
      // Fill in textarea
      await client.type('textarea.form-control', 'This is a test message', testTabId);
      await client.wait(300);
      
      // Verify form values were set before submission
      const textValue = await client.executeJS('document.querySelector("#my-text-id").value', testTabId);
      expect(textValue.value).to.equal('John Doe');
      
      const passwordValue = await client.executeJS('document.querySelector("input[type=\\"password\\"]").value', testTabId);
      expect(passwordValue.value).to.equal('SecurePass123');
      
      const textareaValue = await client.executeJS('document.querySelector("textarea.form-control").value', testTabId);
      expect(textareaValue.value).to.equal('This is a test message');
      
      // Click submit button
      await client.click('button[type="submit"]', testTabId);
      
      // Wait for navigation to confirmation page
      await client.wait(2000);
      
      // Verify we navigated to the submitted page
      await client.waitForElement('h1.display-6', 10000, testTabId);
      const heading = await client.getText('h1.display-6', testTabId);
      expect(heading).to.equal('Form submitted');
      
      const message = await client.getText('#message', testTabId);
      expect(message).to.equal('Received!');
    });

    it('should handle tab switching and interaction', async function() {
      // Open first tab
      const tab1 = await client.openTab(TEST_URLS.EXAMPLE);
      const tab1Id = tab1.tab.id;
      await client.wait(2000);
      
      // Mark tab1
      await client.executeJS('window.tabIdentifier = "tab1"', tab1Id);
      
      // Open second tab
      const tab2 = await client.openTab(TEST_URLS.HTTPBIN);
      const tab2Id = tab2.tab.id;
      await client.wait(2000);
      
      // Mark tab2
      await client.executeJS('window.tabIdentifier = "tab2"', tab2Id);
      
      // Switch back to tab1
      await client.switchTab(tab1Id);
      await client.wait(500);
      
      // Verify we're in tab1
      const identifier1 = await client.executeJS('window.tabIdentifier', tab1Id);
      expect(identifier1.value).to.equal('tab1');
      
      // Verify tab2 still has its identifier
      const identifier2 = await client.executeJS('window.tabIdentifier', tab2Id);
      expect(identifier2.value).to.equal('tab2');
      
      // Clean up both tabs
      await client.closeTab(tab1Id);
      await client.closeTab(tab2Id);
      testTabId = null;
    });
  });
});
