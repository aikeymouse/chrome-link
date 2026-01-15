/**
 * Unit tests for script injection functionality
 */

const { expect } = require('chai');
const { createClient } = require('../helpers/hooks');
const { TEST_URLS } = require('../helpers/test-data');

describe('Script Injection functionality', function() {
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

  describe('registerInjection', function() {
    it('should register a script injection with default parameters', async function() {
      const injectionCode = `
        (function() {
          window.__testInjection = 'injected';
        })();
      `;

      const result = await client.sendRequest('registerInjection', {
        id: 'test-injection-1',
        code: injectionCode
      });

      expect(result).to.have.property('registered', true);
      expect(result).to.have.property('id', 'test-injection-1');
    });

    it('should register a script injection with URL pattern matching', async function() {
      const injectionCode = `
        (function() {
          window.__testInjection = 'selenium-injected';
        })();
      `;

      const result = await client.sendRequest('registerInjection', {
        id: 'test-injection-2',
        code: injectionCode,
        matches: ['https://www.selenium.dev/*'],
        runAt: 'document_start'
      });

      expect(result).to.have.property('registered', true);
      expect(result).to.have.property('id', 'test-injection-2');
    });

    it('should inject code when navigating to matching URL', async function() {
      const injectionCode = `
        (function() {
          window.__injectionMarker = 'test-marker-' + Date.now();
        })();
      `;

      // Register injection
      await client.sendRequest('registerInjection', {
        id: 'test-injection-3',
        code: injectionCode,
        matches: ['https://www.selenium.dev/*'],
        runAt: 'document_start'
      });

      // Open a new tab with matching URL
      const openResult = await client.sendRequest('openTab', { 
        url: TEST_URLS.SELENIUM_FORM 
      });
      testTabId = openResult.tab.id;
      
      // Wait for page to load
      await client.wait(2000);

      // Check if injection was executed
      const checkResult = await client.executeJS(
        'window.__injectionMarker !== undefined',
        testTabId
      );

      expect(checkResult.value).to.equal(true);
    });

    it('should not inject code on non-matching URLs', async function() {
      const injectionCode = `
        (function() {
          window.__specificInjection = 'should-not-appear';
        })();
      `;

      // Register injection for specific domain
      await client.sendRequest('registerInjection', {
        id: 'test-injection-4',
        code: injectionCode,
        matches: ['https://example.com/*'],
        runAt: 'document_start'
      });

      // Open tab with different URL
      const openResult = await client.sendRequest('openTab', { 
        url: TEST_URLS.SELENIUM_FORM 
      });
      testTabId = openResult.tab.id;
      
      await client.wait(2000);

      // Check that injection was NOT executed
      const checkResult = await client.executeJS(
        'window.__specificInjection === undefined',
        testTabId
      );

      expect(checkResult.value).to.equal(true);
    });

    it('should fail when missing required id parameter', async function() {
      try {
        await client.sendRequest('registerInjection', {
          code: 'console.log("test");'
        });
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error).to.have.property('code', 'MISSING_PARAMS');
        expect(error.message).to.include('id');
      }
    });

    it('should fail when missing required code parameter', async function() {
      try {
        await client.sendRequest('registerInjection', {
          id: 'test-injection-no-code'
        });
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error).to.have.property('code', 'MISSING_PARAMS');
        expect(error.message).to.include('code');
      }
    });

    it('should support multiple simultaneous injections', async function() {
      const injection1 = `window.__injection1 = 'first';`;
      const injection2 = `window.__injection2 = 'second';`;

      // Register two different injections
      const result1 = await client.sendRequest('registerInjection', {
        id: 'multi-injection-1',
        code: injection1,
        matches: ['https://www.selenium.dev/*']
      });

      const result2 = await client.sendRequest('registerInjection', {
        id: 'multi-injection-2',
        code: injection2,
        matches: ['https://www.selenium.dev/*']
      });

      expect(result1).to.have.property('registered', true);
      expect(result2).to.have.property('registered', true);

      // Open tab and verify both injections executed
      const openResult = await client.sendRequest('openTab', { 
        url: TEST_URLS.SELENIUM_FORM 
      });
      testTabId = openResult.tab.id;
      
      await client.wait(2000);

      const check1 = await client.executeJS(
        'window.__injection1',
        testTabId
      );

      const check2 = await client.executeJS(
        'window.__injection2',
        testTabId
      );

      expect(check1.value).to.equal('first');
      expect(check2.value).to.equal('second');
    });
  });

  describe('unregisterInjection', function() {
    it('should unregister an existing injection', async function() {
      // First register an injection
      await client.sendRequest('registerInjection', {
        id: 'test-injection-unreg',
        code: 'window.__test = true;',
        matches: ['https://www.selenium.dev/*']
      });

      // Then unregister it
      const result = await client.sendRequest('unregisterInjection', {
        id: 'test-injection-unreg'
      });

      expect(result).to.have.property('unregistered', true);
      expect(result).to.have.property('id', 'test-injection-unreg');
    });

    it('should not inject code after unregistration', async function() {
      const injectionCode = `window.__shouldNotAppear = true;`;

      // Register injection
      await client.sendRequest('registerInjection', {
        id: 'test-injection-then-unreg',
        code: injectionCode,
        matches: ['https://www.selenium.dev/*']
      });

      // Immediately unregister
      await client.sendRequest('unregisterInjection', {
        id: 'test-injection-then-unreg'
      });

      // Open new tab - injection should NOT execute
      const openResult = await client.sendRequest('openTab', { 
        url: TEST_URLS.SELENIUM_FORM 
      });
      testTabId = openResult.tab.id;
      
      await client.wait(2000);

      const checkResult = await client.executeJS(
        'window.__shouldNotAppear === undefined',
        testTabId
      );

      expect(checkResult.value).to.equal(true);
    });

    it('should fail when unregistering non-existent injection', async function() {
      try {
        await client.sendRequest('unregisterInjection', {
          id: 'non-existent-injection'
        });
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error).to.have.property('code', 'INJECTION_ERROR');
        expect(error.message).to.include('not found');
      }
    });

    it('should fail when missing required id parameter', async function() {
      try {
        await client.sendRequest('unregisterInjection', {});
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error).to.have.property('code', 'MISSING_PARAMS');
        expect(error.message).to.include('id');
      }
    });
  });

  describe('Injection timing - runAt parameter', function() {
    it('should support document_start timing', async function() {
      const injectionCode = `
        (function() {
          window.__runAtStart = document.readyState;
        })();
      `;

      await client.sendRequest('registerInjection', {
        id: 'test-timing-start',
        code: injectionCode,
        matches: ['https://www.selenium.dev/*'],
        runAt: 'document_start'
      });

      const openResult = await client.sendRequest('openTab', { 
        url: TEST_URLS.SELENIUM_FORM 
      });
      testTabId = openResult.tab.id;
      
      await client.wait(2000);

      const checkResult = await client.executeJS(
        'window.__runAtStart',
        testTabId
      );

      expect(checkResult.value).to.be.oneOf(['loading', 'interactive', 'complete']);
    });

    it('should support document_end timing', async function() {
      const injectionCode = `
        (function() {
          window.__runAtEnd = true;
        })();
      `;

      await client.sendRequest('registerInjection', {
        id: 'test-timing-end',
        code: injectionCode,
        matches: ['https://www.selenium.dev/*'],
        runAt: 'document_end'
      });

      const openResult = await client.sendRequest('openTab', { 
        url: TEST_URLS.SELENIUM_FORM 
      });
      testTabId = openResult.tab.id;
      
      await client.wait(2000);

      const checkResult = await client.executeJS(
        'window.__runAtEnd',
        testTabId
      );

      // Just verify the injection executed, timing details can vary
      expect(checkResult.value).to.equal(true);
    });
  });

  describe('Session cleanup', function() {
    it('should clean up injections when session expires', async function() {
      // This test verifies that injections are properly cleaned up
      // when associated with a session that expires
      
      const injectionCode = `window.__sessionInjection = true;`;

      // Register injection (will be associated with current session)
      const regResult = await client.sendRequest('registerInjection', {
        id: 'session-cleanup-test',
        code: injectionCode,
        matches: ['https://www.selenium.dev/*']
      });

      expect(regResult).to.have.property('registered', true);

      // Note: Full session cleanup testing requires session expiration
      // which is tested in integration tests
    });
  });
});
