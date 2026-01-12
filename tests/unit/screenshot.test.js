/**
 * Unit tests for screenshot helper functions
 */

const { expect } = require('chai');
const { createClient } = require('../helpers/hooks');
const { TEST_URLS } = require('../helpers/test-data');

describe('Screenshot helper functions', function() {
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
    
    const result = await client.sendRequest('openTab', { 
      url: TEST_URLS.SELENIUM_FORM 
    });
    testTabId = result.tab.id;
    await client.wait(2000);
  });

  afterEach(async function() {
    await client.cleanupTabs(initialTabIds);
  });

  describe('getElementBounds', function() {
    it('should get bounds for single element', async function() {
      const result = await client.callHelper(
        'getElementBounds',
        ['h1'],
        testTabId
      );
      
      client.assertValidExecutionResponse(result);
      expect(result.value).to.be.an('array');
      expect(result.value).to.have.lengthOf(1);
      expect(result.value[0]).to.have.property('index', 0);
      expect(result.value[0]).to.have.property('x');
      expect(result.value[0]).to.have.property('y');
      expect(result.value[0]).to.have.property('width').greaterThan(0);
      expect(result.value[0]).to.have.property('height').greaterThan(0);
      expect(result.value[0]).to.have.property('absoluteX');
      expect(result.value[0]).to.have.property('absoluteY');
    });

    it('should get bounds for multiple elements', async function() {
      const result = await client.callHelper(
        'getElementBounds',
        ['label.form-label'],
        testTabId
      );
      
      client.assertValidExecutionResponse(result);
      expect(result.value).to.be.an('array');
      expect(result.value.length).to.be.greaterThan(1);
      
      // Verify each element has proper bounds
      result.value.forEach((bounds, idx) => {
        expect(bounds.index).to.equal(idx);
        expect(bounds.width).to.be.greaterThan(0);
        expect(bounds.height).to.be.greaterThan(0);
      });
    });

    it('should return empty array for non-existent element', async function() {
      const result = await client.callHelper(
        'getElementBounds',
        ['#nonexistent-element-12345'],
        testTabId
      );
      
      client.assertValidExecutionResponse(result);
      expect(result.value).to.be.an('array');
      expect(result.value).to.have.lengthOf(0);
    });
  });

  describe('scrollElementIntoView', function() {
    it('should scroll first element into view by default', async function() {
      const result = await client.callHelper(
        'scrollElementIntoView',
        ['h1'],
        testTabId
      );
      
      client.assertValidExecutionResponse(result);
      expect(result.value).to.be.an('array');
      expect(result.value).to.have.lengthOf(1);
      expect(result.value[0].index).to.equal(0);
    });

    it('should scroll specific element by index', async function() {
      // Get all labels first to know how many there are
      const boundsResult = await client.callHelper(
        'getElementBounds',
        ['label.form-label'],
        testTabId
      );
      
      expect(boundsResult.value.length).to.be.greaterThan(1);
      
      // Scroll to second element (index 1)
      const result = await client.callHelper(
        'scrollElementIntoView',
        ['label.form-label', 1],
        testTabId
      );
      
      client.assertValidExecutionResponse(result);
      expect(result.value).to.be.an('array');
      expect(result.value.length).to.equal(boundsResult.value.length);
    });

    it('should return empty array for non-existent element', async function() {
      const result = await client.callHelper(
        'scrollElementIntoView',
        ['#nonexistent-element-12345'],
        testTabId
      );
      
      client.assertValidExecutionResponse(result);
      expect(result.value).to.be.an('array');
      expect(result.value).to.have.lengthOf(0);
    });

    it('should clamp index to valid range', async function() {
      // Try to scroll to index 9999 (should clamp to last element)
      const result = await client.callHelper(
        'scrollElementIntoView',
        ['h1', 9999],
        testTabId
      );
      
      client.assertValidExecutionResponse(result);
      expect(result.value).to.be.an('array');
      expect(result.value).to.have.lengthOf(1);
    });
  });

  describe('cropScreenshotToElements', function() {
    it('should crop screenshot to single element', async function() {
      // Get bounds
      const boundsResult = await client.callHelper(
        'getElementBounds',
        ['h1'],
        testTabId
      );
      
      // Create a simple test image (1x1 red pixel)
      const testDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
      
      const result = await client.callHelper(
        'cropScreenshotToElements',
        [testDataUrl, boundsResult.value],
        testTabId
      );
      
      client.assertValidExecutionResponse(result);
      expect(result.value).to.be.an('array');
      expect(result.value).to.have.lengthOf(1);
      expect(result.value[0]).to.have.property('index', 0);
      expect(result.value[0]).to.have.property('dataUrl');
      expect(result.value[0].dataUrl).to.match(/^data:image\/png;base64,/);
      expect(result.value[0]).to.have.property('bounds');
    });

    it('should crop screenshot to multiple elements', async function() {
      // Get bounds for multiple elements
      const boundsResult = await client.callHelper(
        'getElementBounds',
        ['label.form-label'],
        testTabId
      );
      
      expect(boundsResult.value.length).to.be.greaterThan(1);
      
      // Create test image
      const testDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
      
      const result = await client.callHelper(
        'cropScreenshotToElements',
        [testDataUrl, boundsResult.value],
        testTabId
      );
      
      client.assertValidExecutionResponse(result);
      expect(result.value).to.be.an('array');
      expect(result.value.length).to.equal(boundsResult.value.length);
      
      // Verify each cropped screenshot
      result.value.forEach((screenshot, idx) => {
        expect(screenshot.index).to.equal(idx);
        expect(screenshot.dataUrl).to.match(/^data:image\/png;base64,/);
        expect(screenshot.bounds).to.deep.equal(boundsResult.value[idx]);
      });
    });

    it('should return empty array for empty bounds', async function() {
      const testDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
      
      const result = await client.callHelper(
        'cropScreenshotToElements',
        [testDataUrl, []],
        testTabId
      );
      
      client.assertValidExecutionResponse(result);
      expect(result.value).to.be.an('array');
      expect(result.value).to.have.lengthOf(0);
    });

    it('should handle invalid image data', async function() {
      const boundsResult = await client.callHelper(
        'getElementBounds',
        ['h1'],
        testTabId
      );
      
      // Invalid data URL
      const invalidDataUrl = 'data:image/png;base64,INVALID';
      
      const result = await client.callHelper(
        'cropScreenshotToElements',
        [invalidDataUrl, boundsResult.value],
        testTabId
      );
      
      client.assertValidExecutionResponse(result);
      expect(result.value).to.be.an('array');
      expect(result.value).to.have.lengthOf(1);
      expect(result.value[0]).to.have.property('error');
    });
  });

  describe('Screenshot workflow integration', function() {
    it('should complete full screenshot workflow', async function() {
      this.timeout(10000);
      
      const selector = 'h1';
      
      // Step 1: Get bounds
      const boundsResult = await client.callHelper(
        'getElementBounds',
        [selector],
        testTabId
      );
      
      expect(boundsResult.value).to.be.an('array');
      expect(boundsResult.value.length).to.be.greaterThan(0);
      
      // Step 2: Scroll into view
      const scrollResult = await client.callHelper(
        'scrollElementIntoView',
        [selector, 0],
        testTabId
      );
      
      expect(scrollResult.value).to.be.an('array');
      await client.wait(100);
      
      // Step 3: Simulate capturing viewport (in real usage, would use chrome.tabs.captureVisibleTab)
      // For this test, we'll use a test image
      const testDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
      
      // Step 4: Crop to element
      const cropResult = await client.callHelper(
        'cropScreenshotToElements',
        [testDataUrl, scrollResult.value],
        testTabId
      );
      
      client.assertValidExecutionResponse(cropResult);
      expect(cropResult.value).to.be.an('array');
      expect(cropResult.value[0]).to.have.property('dataUrl');
      expect(cropResult.value[0].dataUrl).to.match(/^data:image\/png;base64,/);
    });
  });
});
