#!/usr/bin/env node
/**
 * ChromeLink Script Injection Example
 * Demonstrates registerInjection API for WebView2 testing
 * 
 * This example injects a badge on Google pages to show the injection is working.
 */

const fs = require('fs');
const path = require('path');
const ChromeLinkClient = require('@aikeymouse/chromelink-client');

async function main() {
  const client = new ChromeLinkClient();
  
  try {
    // Connect to ChromeLink
    console.log('Connecting to ChromeLink...');
    await client.connect('ws://localhost:9000', 120000); // 2 minutes timeout
    
    // Test 1: Register WebView2 bridge mock
    console.log('\n📋 Test 1: Registering WebView2 bridge mock...');
    const bridgeCode = `
      console.log('[INJECTION] Script running at:', Date.now(), 'readyState:', document.readyState);
      window.__INJECTION_TIME__ = Date.now();
      window.CommonBrowserControlBridge = function(param) {
        console.log('[BRIDGE] Called with:', param, 'at:', Date.now());
        switch(param) {
          case 'GetAuthToken':
            return 'test-token-12345';
          default:
            return null;
        }
      };
      console.log('[INJECTION] Bridge installed, available immediately');
    `;
    
    const bridgeResult = await client.sendRequest('registerInjection', {
      id: 'webview2-bridge',
      code: bridgeCode,
      matches: ['https://www.selenium.dev/*'],
      runAt: 'document_start'
    });
    console.log('✓ Bridge registered:', bridgeResult);
    
    // Test 2: Register visible badge
    console.log('\n📋 Test 2: Registering visible badge...');
    const badgeCodePath = path.join(__dirname, 'injection-code.js');
    const badgeCode = fs.readFileSync(badgeCodePath, 'utf8');
    
    const badgeResult = await client.sendRequest('registerInjection', {
      id: 'selenium-badge',
      code: badgeCode,
      matches: ['https://www.selenium.dev/*'],
      runAt: 'document_start'
    });
    console.log('✓ Badge registered:', badgeResult);
    
    console.log('\n📌 Instructions:');
    console.log('   1. Navigate to https://www.selenium.dev in Chrome');
    console.log('   2. Open DevTools Console (F12)');
    console.log('   3. You should see:');
    console.log('      - [INJECTION] logs showing script ran at document_start');
    console.log('      - "🚀 ChromeLink Injected" badge in top-right corner');
    console.log('   4. Test the bridge:');
    console.log('      - In console, run: CommonBrowserControlBridge("GetAuthToken")');
    console.log('      - Should return: "test-token-12345"');
    console.log('   5. Refresh the page - injections should run again at document_start');
    console.log('\n⏸  Press Ctrl+C to unregister injections and exit\n');
    
    // Handle graceful shutdown
    const cleanup = async () => {
      console.log('\n\nCleaning up...');
      try {
        // Unregister both injections
        const bridgeUnreg = await client.sendRequest('unregisterInjection', {
          id: 'webview2-bridge'
        });
        console.log('✓ Bridge unregistered:', bridgeUnreg);
        
        const badgeUnreg = await client.sendRequest('unregisterInjection', {
          id: 'selenium-badge'
        });
        console.log('✓ Badge unregistered:', badgeUnreg);
        console.log('   Note: Already loaded pages will keep injections until refreshed');
      } catch (err) {
        console.error('Failed to unregister:', err.message);
      }
      await client.close();
      process.exit(0);
    };
    
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
  } catch (error) {
    console.error('Error:', error.message);
    await client.close();
    process.exit(1);
  }
}

main();
