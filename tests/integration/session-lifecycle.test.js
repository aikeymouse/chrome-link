/**
 * Integration tests for session lifecycle
 */

const { expect } = require('chai');
const TestClient = require('../helpers/test-client');

describe('Session Lifecycle', function() {
  it('should create session on connection', async function() {
    const client = new TestClient();
    await client.connect();
    await client.waitForConnection();
    
    client.assertValidResponse(client, {
      requiredFields: ['sessionId'],
      fieldTypes: { sessionId: 'string' }
    });
    expect(client.sessionId.length).to.be.at.least(1);
    
    client.close();
  });

  it('should handle multiple sequential connections', async function() {
    const client1 = new TestClient();
    await client1.connect();
    await client1.waitForConnection();
    const sessionId1 = client1.sessionId;
    client1.close();
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const client2 = new TestClient();
    await client2.connect();
    await client2.waitForConnection();
    const sessionId2 = client2.sessionId;
    
    expect(sessionId1).to.not.equal(sessionId2);
    
    client2.close();
  });

  it('should maintain session across multiple commands', async function() {
    const client = new TestClient();
    await client.connect();
    await client.waitForConnection();
    
    const sessionId = client.sessionId;
    
    await client.listTabs();
    expect(client.sessionId).to.equal(sessionId);
    
    await client.listTabs();
    expect(client.sessionId).to.equal(sessionId);
    
    await client.listTabs();
    expect(client.sessionId).to.equal(sessionId);
    
    client.close();
  });

  it('should handle connection errors gracefully', async function() {
    const client = new TestClient();
    
    try {
      await client.connect('ws://localhost:9999'); // Wrong port
      expect.fail('Should have thrown error');
    } catch (err) {
      expect(err).to.be.an('error');
    }
  });

  it('should resume session when reconnecting with same session ID', async function() {
    // Create initial connection and get session ID
    const client1 = new TestClient();
    await client1.connect();
    await client1.waitForConnection();
    const originalSessionId = client1.sessionId;
    
    // Create a tab in the first session
    const tabResult = await client1.sendRequest('openTab', { 
      url: 'http://example.com' 
    });
    const tabId = tabResult.tab.id;
    
    // Close the connection (but session remains active on server)
    client1.close();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Reconnect with the same session ID via query parameter
    const client2 = new TestClient();
    await client2.connect(`ws://localhost:9000?sessionId=${originalSessionId}`);
    
    // Wait for session resumed message
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Should have resumed the same session
    expect(client2.sessionId).to.equal(originalSessionId);
    
    // Should still be able to access the tab from the previous session
    const tabs = await client2.listTabs();
    const foundTab = tabs.tabs.find(t => t.id === tabId);
    expect(foundTab).to.exist;
    
    // Cleanup
    await client2.closeTab(tabId);
    client2.close();
  });
});
