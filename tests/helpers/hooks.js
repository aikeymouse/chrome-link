/**
 * Global test hooks and utilities
 */

const ChromeLinkClient = require('./chromelink-client');

/**
 * Create a test client instance
 */
function createClient() {
  return new ChromeLinkClient();
}

module.exports = {
  createClient
};
