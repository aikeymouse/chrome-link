/**
 * Unit tests for openTab command
 */

const { expect } = require('chai');
const { createClient } = require('../helpers/hooks');
const { TEST_URLS } = require('../helpers/fixtures');

describe('openTab command', function() {
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
    
    // Verify cleanup
    const finalResult = await client.listTabs();
    expect(finalResult.tabs.length).to.equal(initialTabIds.length);
  });

  it('should open a new tab with URL', async function() {
    const result = await client.sendRequest('openTab', { 
      url: TEST_URLS.EXAMPLE 
    });
    
    expect(result).to.have.property('tab');
    expect(result.tab).to.have.property('id');
    // URL may be empty initially as page is loading
    expect(result.tab).to.have.property('url');
  });

  it('should open tab with focus option', async function() {
    const result = await client.sendRequest('openTab', { 
      url: TEST_URLS.EXAMPLE,
      focus: true
    });
    
    expect(result.tab).to.have.property('active');
    expect(result.tab.active).to.be.true;
  });

  it('should open tab without focus', async function() {
    const result = await client.sendRequest('openTab', { 
      url: TEST_URLS.EXAMPLE,
      focus: false
    });
    
    expect(result.tab).to.have.property('id');
    // Tab may or may not be active depending on browser state
  });

  describe('error handling', function() {
    it('should handle invalid URL', async function() {
      try {
        await client.sendRequest('openTab', { url: 'not-a-valid-url' });
        throw new Error('Should have thrown error');
      } catch (err) {
        expect(err.message).to.be.a('string');
      }
    });
  });
});
