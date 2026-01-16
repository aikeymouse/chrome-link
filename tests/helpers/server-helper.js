/**
 * Server Helper - Manages native host server lifecycle for tests
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const util = require('util');

const execPromise = util.promisify(exec);

class ServerHelper {
  constructor() {
    this.serverProcess = null;
    this.port = 9000;
    this.wasAlreadyRunning = false;
  }

  /**
   * Check if port is in use
   * @returns {Promise<boolean>}
   */
  async isPortInUse() {
    try {
      const { stdout } = await execPromise(`lsof -i :${this.port} -t`);
      return stdout.trim().length > 0;
    } catch (error) {
      // lsof returns exit code 1 if no process found
      return false;
    }
  }

  /**
   * Start the native host server
   * @returns {Promise<void>}
   */
  async start() {
    if (this.serverProcess) {
      throw new Error('Server is already running');
    }

    // Check if server is already running
    const portInUse = await this.isPortInUse();
    if (portInUse) {
      console.log(`✅ Native host server already running on port ${this.port}`);
      this.wasAlreadyRunning = true;
      return;
    }

    const serverPath = path.join(__dirname, '../../native-host/browser-link-server.js');
    
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
      });

      let output = '';
      let errorOutput = '';
      const timeout = setTimeout(() => {
        reject(new Error('Server failed to start within timeout'));
      }, 5000);

      this.serverProcess.stderr.on('data', (data) => {
        const text = data.toString();
        output += text;
        
        // Check for server started message
        if (output.includes(`WebSocket server listening on port ${this.port}`)) {
          clearTimeout(timeout);
          // Give it a moment to fully initialize
          setTimeout(resolve, 500);
        }
        
        // Check for port in use error
        if (text.includes('EADDRINUSE') || text.includes('already in use')) {
          clearTimeout(timeout);
          console.log(`✅ Native host server already running on port ${this.port}`);
          this.wasAlreadyRunning = true;
          this.serverProcess = null;
          resolve();
        }
      });

      this.serverProcess.stdout.on('data', (data) => {
        errorOutput += data.toString();
      });

      this.serverProcess.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      this.serverProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          clearTimeout(timeout);
          reject(new Error(`Server exited with code ${code}: ${errorOutput}`));
        }
      });
    });
  }

  /**
   * Stop the native host server
   * @returns {Promise<void>}
   */
  async stop() {
    // Don't stop the server if it was already running before tests
    if (this.wasAlreadyRunning) {
      console.log('ℹ️  Leaving existing server running');
      return;
    }

    if (!this.serverProcess) {
      return;
    }

    return new Promise((resolve) => {
      this.serverProcess.on('exit', () => {
        this.serverProcess = null;
        resolve();
      });

      this.serverProcess.kill('SIGTERM');
      
      // Force kill after 2 seconds if not stopped
      setTimeout(() => {
        if (this.serverProcess) {
          this.serverProcess.kill('SIGKILL');
        }
      }, 2000);
    });
  }

  /**
   * Check if server is running
   * @returns {boolean}
   */
  isRunning() {
    return this.wasAlreadyRunning || (this.serverProcess !== null && !this.serverProcess.killed);
  }
}

module.exports = ServerHelper;
