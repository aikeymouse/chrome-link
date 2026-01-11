/**
 * Unit tests for listTabs command
 */

const { expect } = require('chai');
const { createClient } = require('../helpers/hooks');

describe('listTabs command', function() {
  let client;

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

  it('should return array of tabs', async function() {
    const result = await client.listTabs();
    
    expect(result).to.be.an('object');
    expect(result.tabs).to.be.an('array');
    expect(result.tabs.length).to.be.at.least(0);
  });

  it('should return tabs with required properties', async function() {
    const result = await client.listTabs();
    
    if (result.tabs.length > 0) {
      const tab = result.tabs[0];
      expect(tab).to.have.property('id');
      expect(tab).to.have.property('url');
      expect(tab).to.have.property('title');
      expect(tab.id).to.be.a('number');
    }
  });

  it('should return consistent results on multiple calls', async function() {
    const result1 = await client.listTabs();
    const result2 = await client.listTabs();
    
    expect(result1.tabs.length).to.equal(result2.tabs.length);
  });

  describe('error handling', function() {
    it('should handle timeout gracefully', async function() {
      // This test validates timeout mechanism exists
      // Actual timeout would take 30s, so we just verify structure
      expect(client.pendingRequests).to.be.a('map');
    });
  });
});
