/**
 * Enhanced test client with helper methods
 */

const ChromePilotClient = require('../examples/chromepilot-client');

class TestClient extends ChromePilotClient {
  /**
   * Wait for connection with timeout
   */
  async waitForConnection(timeout = 5000) {
    const start = Date.now();
    while (!this.sessionId && Date.now() - start < timeout) {
      await this.wait(100);
    }
    if (!this.sessionId) {
      throw new Error('Connection timeout - session not created');
    }
    return true;
  }

  /**
   * Get initial tab IDs for cleanup tracking
   */
  async getInitialTabIds() {
    const result = await this.listTabs();
    return result.tabs.map(tab => tab.id);
  }

  /**
   * Cleanup tabs created during test
   */
  async cleanupTabs(initialTabIds) {
    const currentResult = await this.listTabs();
    const currentTabIds = currentResult.tabs.map(tab => tab.id);
    
    // Close tabs that weren't there initially
    for (const tabId of currentTabIds) {
      if (!initialTabIds.includes(tabId)) {
        try {
          await this.closeTab(tabId);
        } catch (err) {
          // Tab may already be closed
          console.log(`Could not close tab ${tabId}: ${err.message}`);
        }
      }
    }
  }

  /**
   * Assert response is valid
   */
  assertValidResponse(response, expectedFields = []) {
    if (!response) {
      throw new Error('Response is null or undefined');
    }
    for (const field of expectedFields) {
      if (!(field in response)) {
        throw new Error(`Response missing expected field: ${field}`);
      }
    }
    return true;
  }

  /**
   * Wait for tab to be ready
   */
  async waitForTabReady(tabId, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        const result = await this.executeJS('document.readyState', tabId);
        if (result.value === 'complete' || result.value === 'interactive') {
          return true;
        }
      } catch (err) {
        // Tab might not be ready yet
      }
      await this.wait(100);
    }
    throw new Error(`Tab ${tabId} not ready within ${timeout}ms`);
  }
}

module.exports = TestClient;
