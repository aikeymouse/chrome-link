/**
 * Session Helper - Common session management utilities
 */

const crypto = require('crypto');

/**
 * Create a test session with default timeout
 * @param {object} client - ChromePilot client instance
 * @param {number} timeout - Session timeout in milliseconds (default: 60000)
 * @returns {Promise<string>} Session ID
 */
async function createTestSession(client, timeout = 60000) {
  await client.connect(timeout);
  return client.sessionId;
}

/**
 * Wait for a specific amount of time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a random session ID
 * @returns {string} Random UUID
 */
function generateSessionId() {
  return crypto.randomUUID();
}

/**
 * Cleanup session and disconnect client
 * @param {object} client - ChromePilot client instance
 * @returns {Promise<void>}
 */
async function cleanupSession(client) {
  if (client && client.ws) {
    await client.disconnect();
  }
}

module.exports = {
  createTestSession,
  wait,
  generateSessionId,
  cleanupSession
};
