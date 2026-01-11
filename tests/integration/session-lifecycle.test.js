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
    
    expect(client.sessionId).to.be.a('string');
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
});
