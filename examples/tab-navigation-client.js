const WebSocket = require('ws');

/**
 * Tab Navigation Example
 * Demonstrates: openTab, navigateTab, goBack, goForward
 * 
 * IMPORTANT: Chrome focuses the address bar after programmatic navigation.
 * For goBack/goForward to work, the page must have focus (not the address bar).
 * 
 * In automated scenarios:
 * - Manually click on the page content before calling goBack/goForward
 * - Or use a DOM interaction (like clicking an element) to move focus to the page
 * 
 * For manual testing:
 * - Run this script and click anywhere on the page before the script executes goBack
 * - You'll see it works correctly when the page has focus
 */
async function main() {
  console.log('🚀 Tab Navigation Example\n');
  
  console.log('Connecting to ws://localhost:9000/session...');
  const ws = new WebSocket('ws://localhost:9000/session?timeout=60000');
  
  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
    setTimeout(() => reject(new Error('Connection timeout')), 5000);
  });
  
  console.log('✓ Connected\n');
  
  // Helper to send command
  const send = (action, params = {}) => {
    return new Promise((resolve, reject) => {
      const requestId = `req-${Date.now()}-${Math.random()}`;
      const timeout = setTimeout(() => {
        ws.off('message', handler);
        reject(new Error(`Timeout waiting for ${action}`));
      }, 10000);
      
      const handler = (data) => {
        const msg = JSON.parse(data.toString());
        
        // Handle session events
        if (msg.type === 'sessionCreated') {
          console.log(`Session ID: ${msg.sessionId}\n`);
          return;
        }
        
        if (msg.requestId === requestId) {
          clearTimeout(timeout);
          ws.off('message', handler);
          
          if (msg.error) {
            reject(new Error(JSON.stringify(msg.error, null, 2)));
          } else {
            resolve(msg.result);
          }
        }
      };
      
      ws.on('message', handler);
      ws.send(JSON.stringify({ action, params, requestId }));
    });
  };
  
  try {
    // 1. Open a new blank tab
    console.log('1️⃣  Opening new blank tab...');
    const openResult = await send('openTab', { 
      url: 'about:blank',
      focus: true 
    });
    const tabId = openResult.tab.id;
    console.log(`✓ Opened tab ${tabId}\n`);
    
    // Wait for tab to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 2. Navigate to example.com
    console.log('2️⃣  Navigating to example.com...');
    await send('navigateTab', { 
      tabId,
      url: 'https://example.com',
      focus: true
    });
    console.log('✓ Navigated to example.com\n');
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check URL after example.com navigation
    const exampleUrl = await send('executeJS', {
      tabId,
      code: 'window.location.href'
    });
    if (!exampleUrl.value.includes('example.com')) {
      console.log(`⚠️  WARNING: Expected example.com, but got: ${exampleUrl.value}\n`);
    }
    
    // 3. Navigate to httpbin.org
    console.log('3️⃣  Navigating to httpbin.org...');
    await send('navigateTab', { 
      tabId,
      url: 'https://httpbin.org',
      focus: true
    });
    console.log('✓ Navigated to httpbin.org\n');
    
    // Wait for navigation to complete
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check what URL we actually navigated to
    console.log('🔍 Checking actual URL after navigation...');
    const afterNavUrl = await send('executeJS', {
      tabId,
      code: 'window.location.href'
    });
    console.log(`Actual URL: ${afterNavUrl.value}`);
    if (!afterNavUrl.value.includes('httpbin.org')) {
      console.log(`⚠️  WARNING: Expected httpbin.org, but got: ${afterNavUrl.value}`);
    }
    console.log();
    
    console.log('⚠️  NOTE: Click anywhere on the page now to give it focus (address bar is currently focused)');
    console.log('    Waiting 10 seconds for you to click...\n');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // 4. Go back to example.com
    console.log('4️⃣  Going back to example.com...');
    const backResult = await send('goBack', { tabId });
    if (backResult.success) {
      console.log('✓ Went back to example.com\n');
    } else {
      console.log(`⚠️  ${backResult.message}\n`);
    }
    
    // Wait for navigation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 5. Verify we're at example.com
    console.log('5️⃣  Verifying current URL...');
    const backUrl = await send('executeJS', {
      tabId,
      code: 'window.location.href'
    });
    console.log(`Current URL: ${backUrl.value}`);
    if (!backUrl.value.includes('example.com')) {
      console.log(`⚠️  WARNING: Expected example.com after goBack, but got: ${backUrl.value}`);
    }
    console.log();
    
    // 6. Go forward to httpbin.org
    console.log('6️⃣  Going forward to httpbin.org...');
    const forwardResult = await send('goForward', { tabId });
    if (forwardResult.success) {
      console.log('✓ Went forward to httpbin.org\n');
    } else {
      console.log(`⚠️  ${forwardResult.message}\n`);
    }
    
    // Wait for navigation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 7. Verify final URL
    console.log('7️⃣  Verifying final URL...');
    const forwardUrl = await send('executeJS', {
      tabId,
      code: 'window.location.href'
    });
    console.log(`Final URL: ${forwardUrl.value}`);
    if (!forwardUrl.value.includes('httpbin.org')) {
      console.log(`⚠️  WARNING: Expected httpbin.org after goForward, but got: ${forwardUrl.value}`);
    }
    console.log();
    
    console.log('✅ Tab navigation test completed successfully!');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    ws.close();
  }
}

main().catch(console.error);
