/**
 * Gemini Chat Client
 * Automates interaction with Gemini (gemini.google.com)
 * Supports multi-turn conversations in the same session
 */

const ChromeLinkClient = require('@aikeymouse/chromelink-client');

class GeminiClient {
  constructor() {
    this.client = new ChromeLinkClient();
    this.geminiTabId = null;
  }

  async connect() {
    await this.client.connect();
    await this.client.wait(500);
  }

  /**
   * Find and switch to Gemini tab
   * Throws error immediately if not found
   */
  async switchToGemini() {
    console.log('→ Finding Gemini tab...');
    const tabs = await this.client.listTabs();
    
    const geminiTab = tabs.tabs.find(tab => tab.url.startsWith('https://gemini.google.com'));
    
    if (!geminiTab) {
      throw new Error('No Gemini tab found. Please open gemini.google.com first.');
    }
    
    this.geminiTabId = geminiTab.id;
    this.client.currentTabId = geminiTab.id;
    console.log(`✓ Found Gemini tab: ${geminiTab.id}`);
    
    // Switch to the tab
    await this.client.sendRequest('switchTab', { tabId: geminiTab.id });
    await this.client.wait(500);
    
    return geminiTab;
  }

  /**
   * Click on the input textarea
   * Fails immediately if not found
   */
  async clickInput() {
    console.log('→ Clicking input field...');
    await this.client.callHelper('clickElement', ['rich-textarea .ql-editor[contenteditable="true"]']);
    await this.client.wait(500);
    console.log('✓ Input field focused');
  }

  /**
   * Type text into the active input (simulates human typing with delays)
   */
  async typeText(text) {
    console.log(`→ Typing: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    
    // Clear the input first
    await this.client.callHelper('clearContentEditable', ['rich-textarea .ql-editor[contenteditable="true"]']);
    
    // Type one character at a time with human-like delays
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      await this.client.callHelper('appendChar', ['rich-textarea .ql-editor[contenteditable="true"]', char]);
      
      // Random delay between 100-200ms to simulate human typing
      const delay = Math.floor(Math.random() * 100) + 100;
      await this.client.wait(delay);
    }
    
    console.log('✓ Text entered');
  }

  /**
   * Click the send button
   * Fails immediately if not found
   */
  async clickSend() {
    console.log('→ Clicking send button...');
    await this.client.callHelper('clickElement', ['button.send-button[aria-label="Send message"]']);
    await this.client.wait(1000);
    console.log('✓ Message sent');
  }

  /**
   * Wait for Gemini to finish responding (microphone icon reappears)
   */
  async waitForResponse(timeout = 60000) {
    console.log('→ Waiting for Gemini response...');
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const result = await this.client.callHelper('isVisible', ['.mic-button-container:not(.hidden)']);
        
        if (result.value === true) {
          console.log('✓ Response received');
          await this.client.wait(500);
          return true;
        }
      } catch (err) {
        // Ignore errors and retry
      }
      
      await this.client.wait(1000);
    }
    
    throw new Error('Timeout waiting for Gemini response');
  }

  /**
   * Get the latest response text (preserves HTML tags)
   */
  async getLatestResponse() {
    console.log('→ Getting latest response...');
    const result = await this.client.callHelper('getLastHTML', ['message-content .markdown']);
    console.log('✓ Response retrieved');
    return result.value;
  }

  /**
   * Clean HTML response to extract readable text
   */
  cleanResponse(html) {
    if (!html) return '';
    
    // Remove script and style tags completely
    let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // Convert common HTML tags to text equivalents
    cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
    cleaned = cleaned.replace(/<\/p>/gi, '\n');
    cleaned = cleaned.replace(/<\/div>/gi, '\n');
    cleaned = cleaned.replace(/<\/h[1-6]>/gi, '\n');
    cleaned = cleaned.replace(/<\/li>/gi, '\n');
    cleaned = cleaned.replace(/<li[^>]*>/gi, '• ');
    
    // Convert code blocks
    cleaned = cleaned.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, (match, code) => {
      return '\n```\n' + code + '\n```\n';
    });
    cleaned = cleaned.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
    
    // Convert bold and italic
    cleaned = cleaned.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    cleaned = cleaned.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    cleaned = cleaned.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    cleaned = cleaned.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
    
    // Remove all other HTML tags
    cleaned = cleaned.replace(/<[^>]+>/g, '');
    
    // Decode HTML entities
    cleaned = cleaned.replace(/&nbsp;/g, ' ');
    cleaned = cleaned.replace(/&amp;/g, '&');
    cleaned = cleaned.replace(/&lt;/g, '<');
    cleaned = cleaned.replace(/&gt;/g, '>');
    cleaned = cleaned.replace(/&quot;/g, '"');
    cleaned = cleaned.replace(/&#39;/g, "'");
    
    // Clean up whitespace
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n'); // Max 2 consecutive newlines
    cleaned = cleaned.replace(/[ \t]+/g, ' '); // Multiple spaces to single space
    cleaned = cleaned.trim();
    
    return cleaned;
  }

  /**
   * Send a prompt to Gemini and get the response
   * Supports multi-turn conversations - keeps same tab focused
   */
  async ask(prompt, cleanHtml = true) {
    // Only switch to Gemini tab if not already focused
    if (!this.geminiTabId) {
      await this.switchToGemini();
    }
    
    await this.clickInput();
    await this.typeText(prompt);
    await this.clickSend();
    await this.waitForResponse();
    const response = await this.getLatestResponse();
    
    // Clean HTML by default
    if (cleanHtml) {
      return this.cleanResponse(response);
    }
    
    return response;
  }

  close() {
    this.client.close();
  }
}

module.exports = GeminiClient;

// Example usage
if (require.main === module) {
  const readline = require('readline');
  
  // Check command line arguments
  const args = process.argv.slice(2);
  const mode = args[0] || 'test'; // 'test' or 'chat'
  
  if (mode === 'chat') {
    // Interactive chat mode
    (async () => {
      const gemini = new GeminiClient();
      
      try {
        await gemini.connect();
        console.log('\n🤖 Gemini Chat Mode');
        console.log('━'.repeat(60));
        console.log('Type your questions and press Enter.');
        console.log('Commands: /exit or /quit to exit, /clear to start new conversation');
        console.log('━'.repeat(60) + '\n');
        
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
          prompt: '💬 You: '
        });
        
        rl.prompt();
        
        rl.on('line', async (line) => {
          const input = line.trim();
          
          // Handle commands
          if (input === '/exit' || input === '/quit') {
            console.log('\n👋 Goodbye!\n');
            rl.close();
            gemini.close();
            process.exit(0);
            return;
          }
          
          if (input === '/clear') {
            console.log('\n🔄 Starting new conversation...\n');
            gemini.geminiTabId = null;
            rl.prompt();
            return;
          }
          
          if (!input) {
            rl.prompt();
            return;
          }
          
          try {
            console.log('\n⏳ Waiting for response...\n');
            const response = await gemini.ask(input);
            console.log('🤖 Gemini:');
            console.log('─'.repeat(60));
            console.log(response);
            console.log('─'.repeat(60) + '\n');
          } catch (err) {
            console.error('❌ Error:', err.message);
          }
          
          rl.prompt();
        });
        
        rl.on('close', () => {
          gemini.close();
          process.exit(0);
        });
        
      } catch (err) {
        console.error('\n✗ Error:', err.message);
        console.error(err.stack);
        process.exit(1);
      }
    })();
  } else {
    // Test mode (default)
    (async () => {
      const gemini = new GeminiClient();
      
      try {
        await gemini.connect();
        console.log('\n=== Gemini Client Test ===\n');
        
        // Generate random math problem
        const num1 = Math.floor(Math.random() * 20) + 1;
        const num2 = Math.floor(Math.random() * 20) + 1;
        const operations = ['+', '-', '*'];
        const op = operations[Math.floor(Math.random() * operations.length)];
        
        console.log(`📊 Testing with: ${num1} ${op} ${num2}`);
        
        // First question
        const response1 = await gemini.ask(`What is ${num1} ${op} ${num2}? Answer in one sentence.`);
        console.log('\n📝 Gemini Response 1:');
        console.log('━'.repeat(60));
        console.log(response1);
        console.log('━'.repeat(60));
        
        // Follow-up question (multi-turn conversation)
        const num3 = Math.floor(Math.random() * 20) + 1;
        const num4 = Math.floor(Math.random() * 20) + 1;
        const op2 = operations[Math.floor(Math.random() * operations.length)];
        
        console.log(`\n📊 Follow-up: ${num3} ${op2} ${num4}`);
        
        await gemini.client.wait(2000);
        const response2 = await gemini.ask(`What about ${num3} ${op2} ${num4}?`);
        console.log('\n📝 Gemini Response 2:');
        console.log('━'.repeat(60));
        console.log(response2);
        console.log('━'.repeat(60));
        
        console.log('\n✓ Test completed successfully!\n');
        
      } catch (err) {
        console.error('\n✗ Error:', err.message);
        console.error(err.stack);
      } finally {
        gemini.close();
        process.exit(0);
      }
    })();
  }
}
