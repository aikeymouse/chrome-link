#!/usr/bin/env node
/**
 * ChromePilot Markdown Report Generator
 * Generates a markdown report with screenshots from page-analysis.json
 * 
 * Usage:
 *   node generate-md-client.js <url> [--input <json-file>] [--output <md-file>]
 * 
 * Examples:
 *   node generate-md-client.js https://www.selenium.dev/selenium/web/web-form.html
 *   node generate-md-client.js https://github.com/login --input login-analysis.json
 *   node generate-md-client.js https://example.com --output custom-report.md
 */

const ChromePilotClient = require('./chromepilot-client');
const fs = require('fs');
const path = require('path');

class MarkdownReportGenerator {
  constructor() {
    this.client = new ChromePilotClient();
    this.sessionId = null;
    this.screenshotDir = path.join(__dirname, 'output', 'screenshots');
  }

  async connect() {
    await this.client.connect();
    this.sessionId = this.client.sessionId;
  }

  /**
   * Ensure screenshots directory exists
   */
  ensureScreenshotDir() {
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
      console.log(`✓ Created screenshots directory: ${this.screenshotDir}`);
    }
  }

  /**
   * Save base64 screenshot to file
   */
  saveScreenshot(dataUrl, filename) {
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    const filepath = path.join(this.screenshotDir, filename);
    fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));
    return filepath;
  }

  /**
   * Capture screenshot of element with highlighting
   */
  async captureElementScreenshot(tabId, selector, filename) {
    try {
      // Highlight the element
      await this.client.sendRequest('callHelper', {
        tabId,
        functionName: 'highlightElement',
        args: [selector]
      });

      // Wait for highlight animation
      await new Promise(resolve => setTimeout(resolve, 300));

      // Capture screenshot of the specific element
      const captureResult = await this.client.sendRequest('captureScreenshot', {
        tabId,
        selector: selector
      });

      // Remove highlight
      await this.client.sendRequest('callHelper', {
        tabId,
        functionName: 'removeHighlights',
        args: []
      });

      // Save screenshot
      if (captureResult.screenshots && captureResult.screenshots.length > 0) {
        const screenshot = captureResult.screenshots[0];
        const filepath = this.saveScreenshot(screenshot.dataUrl, filename);
        console.log(`  ✓ Saved screenshot: ${filename}`);
        return path.relative(path.join(__dirname, 'output'), filepath);
      } else {
        console.log(`  ⚠ No screenshot captured for: ${selector}`);
        return null;
      }
    } catch (error) {
      console.log(`  ⚠ Failed to capture screenshot for ${selector}: ${error.message}`);
      return null;
    }
  }

  /**
   * Capture full page screenshot with container highlighted
   */
  async captureContainerScreenshot(tabId, containerSelector, filename) {
    try {
      // Highlight container
      await this.client.sendRequest('callHelper', {
        tabId,
        functionName: 'highlightElement',
        args: [containerSelector]
      });

      // Wait for highlight animation
      await new Promise(resolve => setTimeout(resolve, 300));

      // Capture full viewport
      const captureResult = await this.client.sendRequest('captureScreenshot', { tabId });

      // Remove highlight
      await this.client.sendRequest('callHelper', {
        tabId,
        functionName: 'removeHighlights',
        args: []
      });

      // Save screenshot
      const filepath = this.saveScreenshot(captureResult.dataUrl, filename);
      console.log(`  ✓ Saved container screenshot: ${filename}`);
      return path.relative(path.join(__dirname, 'output'), filepath);
    } catch (error) {
      console.log(`  ⚠ Failed to capture container screenshot: ${error.message}`);
      return null;
    }
  }

  /**
   * Group elements by type
   */
  groupElementsByType(elements) {
    const groups = new Map();

    for (const element of elements) {
      let groupKey;
      
      // Create group key based on tagName and type
      if (element.tagName === 'input' && element.type) {
        groupKey = `INPUT-${element.type.toUpperCase()}`;
      } else if (element.tagName === 'button') {
        groupKey = 'BUTTON';
      } else if (element.tagName === 'select') {
        groupKey = 'SELECT';
      } else if (element.tagName === 'textarea') {
        groupKey = 'TEXTAREA';
      } else if (element.tagName === 'a') {
        groupKey = 'LINK';
      } else if (element.tagName === 'label') {
        groupKey = 'LABEL';
      } else {
        groupKey = element.tagName.toUpperCase();
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey).push(element);
    }

    return groups;
  }

  /**
   * Generate markdown content
   */
  async generateMarkdown(analysisData, url, tabId) {
    const lines = [];
    const { container, elements, validation } = analysisData;

    // Title and metadata
    lines.push('# Form Analysis Report\n');
    lines.push(`**URL:** ${url}\n`);
    lines.push(`**Container:** \`${container.selector}\`\n`);
    lines.push(`**Total Elements:** ${elements.length}\n`);
    
    if (validation) {
      lines.push(`**Validation:** ${validation.unique} unique selectors, ${validation.ambiguous} ambiguous\n`);
    }

    // Capture container screenshot
    console.log('\n📸 Capturing container screenshot...');
    const containerScreenshot = await this.captureContainerScreenshot(
      tabId,
      container.selector,
      'container-full-page.png'
    );
    
    if (containerScreenshot) {
      lines.push(`\n## Full Page View\n`);
      lines.push(`![Container highlighted](${containerScreenshot})\n`);
    }

    // Table of contents
    lines.push('\n## Table of Contents\n');
    const groups = this.groupElementsByType(elements);
    for (const [groupKey] of groups) {
      const anchor = groupKey.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      lines.push(`- [${groupKey}](#${anchor})\n`);
    }

    // Generate sections for each element type
    console.log('\n📸 Capturing element screenshots...');
    let elementIndex = 0;

    for (const [groupKey, groupElements] of groups) {
      lines.push(`\n## ${groupKey}\n`);
      lines.push(`Found ${groupElements.length} element(s)\n`);

      for (const element of groupElements) {
        elementIndex++;
        const screenshotFilename = `element-${elementIndex.toString().padStart(3, '0')}.png`;
        
        console.log(`  [${elementIndex}/${elements.length}] ${element.selector}`);
        
        // Capture element screenshot
        const screenshotPath = await this.captureElementScreenshot(
          tabId,
          element.selector,
          screenshotFilename
        );

        // Element heading
        const elementTitle = element.textContent || element.name || element.id || `Element ${elementIndex}`;
        lines.push(`\n### ${elementTitle.substring(0, 50)}\n`);

        // Screenshot
        if (screenshotPath) {
          lines.push(`![${element.selector}](${screenshotPath})\n`);
        }

        // Selector
        lines.push('\n**Selector:**\n');
        lines.push('```css\n');
        lines.push(element.selector + '\n');
        lines.push('```\n');

        // Properties table
        lines.push('\n**Properties:**\n');
        lines.push('| Property | Value |\n');
        lines.push('|----------|-------|\n');
        lines.push(`| Tag Name | \`${element.tagName}\` |\n`);
        
        if (element.type) {
          lines.push(`| Type | \`${element.type}\` |\n`);
        }
        if (element.id) {
          lines.push(`| ID | \`${element.id}\` |\n`);
        }
        if (element.name) {
          lines.push(`| Name | \`${element.name}\` |\n`);
        }
        if (element.placeholder) {
          lines.push(`| Placeholder | ${element.placeholder} |\n`);
        }
        if (element.value) {
          lines.push(`| Value | ${element.value} |\n`);
        }
        if (element.label) {
          lines.push(`| Label | \`${element.label}\` |\n`);
        }
        if (element.textContent) {
          lines.push(`| Text Content | ${element.textContent} |\n`);
        }
        
        lines.push(`| Required | ${element.required ? 'Yes' : 'No'} |\n`);
        lines.push(`| Disabled | ${element.disabled ? 'Yes' : 'No'} |\n`);
        lines.push(`| Visible | ${element.visible ? 'Yes' : 'No'} |\n`);

        lines.push('\n---\n');
      }
    }

    // Footer
    lines.push('\n---\n');
    lines.push(`\n*Generated on ${new Date().toLocaleString()}*\n`);

    return lines.join('');
  }

  /**
   * Generate report
   */
  async generateReport(url, inputFile, outputFile) {
    console.log('\n🔍 Starting markdown report generation...\n');
    
    // Load analysis data
    console.log(`📄 Loading analysis from: ${inputFile}`);
    const analysisData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    console.log(`  ✓ Loaded ${analysisData.elements.length} elements\n`);

    // Ensure screenshot directory exists
    this.ensureScreenshotDir();

    // Open the URL
    console.log(`🌐 Opening URL: ${url}`);
    const openResult = await this.client.sendRequest('openTab', {
      url,
      focus: true
    });
    const tabId = openResult.tab.id;
    console.log(`  ✓ Tab opened: ${tabId}\n`);

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate markdown
    const markdown = await this.generateMarkdown(analysisData, url, tabId);

    // Save markdown file
    console.log(`\n💾 Saving markdown report to: ${outputFile}`);
    fs.writeFileSync(outputFile, markdown, 'utf8');
    console.log(`  ✓ Report saved successfully\n`);

    // Cleanup
    console.log('🧹 Cleaning up...');
    await this.client.sendRequest('callHelper', {
      tabId,
      functionName: 'removeHighlights',
      args: []
    });
    await this.client.closeTab(tabId);
    console.log('  ✓ Cleanup complete\n');

    console.log('✅ Markdown report generation complete!\n');
    console.log(`📄 Report: ${outputFile}`);
    console.log(`📁 Screenshots: ${this.screenshotDir}\n`);
  }

  close() {
    this.client.close();
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
ChromePilot Markdown Report Generator

Usage:
  node generate-md-client.js <url> [--input <json-file>] [--output <md-file>]

Arguments:
  url                    The URL to open and screenshot

Options:
  --input <file>         Input JSON file (default: output/page-analysis.json)
  --output <file>        Output markdown file (default: output/page-report.md)
  -h, --help            Show this help message

Examples:
  node generate-md-client.js https://www.selenium.dev/selenium/web/web-form.html
  node generate-md-client.js https://github.com/login --input login-analysis.json
  node generate-md-client.js https://example.com --output custom-report.md
    `);
    process.exit(0);
  }

  const url = args[0];
  let inputFile = path.join(__dirname, 'output', 'page-analysis.json');
  let outputFile = path.join(__dirname, 'output', 'page-report.md');

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      inputFile = path.resolve(args[i + 1]);
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      outputFile = path.resolve(args[i + 1]);
      i++;
    }
  }

  return { url, inputFile, outputFile };
}

// Main execution
async function main() {
  const { url, inputFile, outputFile } = parseArgs();

  // Validate input file exists
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Error: Input file not found: ${inputFile}`);
    console.error(`\nRun analyze-page-client.js first to generate the analysis file.`);
    process.exit(1);
  }

  const generator = new MarkdownReportGenerator();

  try {
    await generator.connect();
    await generator.generateReport(url, inputFile, outputFile);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    generator.close();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = MarkdownReportGenerator;
