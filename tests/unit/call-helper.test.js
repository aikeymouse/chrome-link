/**
 * Unit tests for callHelper command
 */

const { expect } = require('chai');
const { createClient } = require('../helpers/hooks');
const { TEST_URLS } = require('../helpers/fixtures');

describe('callHelper command', function() {
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
      url: TEST_URLS.EXAMPLE 
    });
    testTabId = result.tab.id;
    
    await client.wait(1000);
  });

  afterEach(async function() {
    await client.cleanupTabs(initialTabIds);
  });

  it('should call clickElement helper', async function() {
    const result = await client.callHelper(
      'clickElement',
      ['h1'],
      testTabId
    );
    
    client.assertValidExecutionResponse(result);
    expect(result.value).to.be.true;
  });

  it('should call getText helper', async function() {
    const result = await client.callHelper(
      'getText',
      ['h1'],
      testTabId
    );
    
    client.assertValidExecutionResponse(result);
    expect(result.value).to.be.a('string');
    expect(result.value.length).to.be.at.least(1);
  });

  it('should call getHTML helper', async function() {
    const result = await client.callHelper(
      'getHTML',
      ['h1'],
      testTabId
    );
    
    client.assertValidExecutionResponse(result);
    expect(result.value).to.be.a('string');
  });

  it('should call elementExists helper', async function() {
    const result = await client.callHelper(
      'elementExists',
      ['h1'],
      testTabId
    );
    
    client.assertValidExecutionResponse(result);
    expect(result.value).to.be.true;
  });

  it('should call isVisible helper', async function() {
    const result = await client.callHelper(
      'isVisible',
      ['h1'],
      testTabId
    );
    
    client.assertValidExecutionResponse(result);
    expect(result.value).to.be.a('boolean');
  });

  describe('error handling', function() {
    it('should handle TAB_NOT_FOUND error', async function() {
      try {
        await client.callHelper('getText', ['h1'], 999999);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err.message).to.include('TAB_NOT_FOUND');
      }
    });

    it('should handle unknown helper function', async function() {
      try {
        await client.callHelper('nonExistentHelper', [], testTabId);
        throw new Error('Should have thrown error');
      } catch (err) {
        expect(err.message).to.be.a('string');
      }
    });

    it('should handle element not found', async function() {
      const result = await client.callHelper(
        'elementExists',
        ['#nonexistent-element'],
        testTabId
      );
      
      client.assertValidExecutionResponse(result);
      expect(result.value).to.be.false;
    });
  });
});
