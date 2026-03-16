const { spawn } = require('child_process');
const EventEmitter = require('events');

/**
 * Persistent Agent Manager
 *
 * Maintains a long-running Claude Code process with stdin/stdout communication.
 * This is the CORRECT approach for maintaining session state.
 */
class PersistentAgentManager extends EventEmitter {
  constructor(projectDir, options = {}) {
    super();

    this.projectDir = projectDir;
    this.process = null;
    this.isReady = false;
    this.responseIdleMs = options.responseIdleMs || 3000;
    this.execTimeout = options.execTimeout || 300000; // 5 minutes for complex operations
    this.claudeTools = options.claudeTools || 'Bash,Read,Write,Edit,Glob,Grep';

    // Response handling
    this.pendingResponse = null;
    this.responseBuffer = '';
    this.idleTimer = null;
    this.timeoutTimer = null;

    // Watchdog
    this.watchdogInterval = null;
    this.watchdogEnabled = false;
    this.crashCount = 0;
    this.lastCrashTime = null;
  }

  /**
   * Spawn the persistent Claude process
   */
  spawn(initialPrompt = null) {
    return new Promise((resolve, reject) => {
      console.log(`[Persistent Agent] Spawning Claude process in ${this.projectDir}`);

      // Build the initial command
      const args = [
        '--allowedTools', this.claudeTools,
        '--dangerously-skip-permissions'
      ];

      // If we have an initial prompt (persona), add it
      if (initialPrompt) {
        args.push('-p', initialPrompt);
      }

      // Spawn the process
      this.process = spawn('claude', args, {
        cwd: this.projectDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: process.env
      });

      // Set up output handlers
      this.process.stdout.on('data', (data) => {
        this.handleOutput(data.toString());
      });

      this.process.stderr.on('data', (data) => {
        const errorText = data.toString();
        console.error(`[Persistent Agent] stderr:`, errorText);
      });

      this.process.on('exit', (code, signal) => {
        console.error(`[Persistent Agent] Process exited with code ${code}, signal ${signal}`);
        this.isReady = false;
        this.emit('exit', { code, signal });

        // Track crash
        this.crashCount++;
        this.lastCrashTime = new Date();

        // Reject pending responses
        if (this.pendingResponse) {
          this.pendingResponse.reject(new Error(`Process exited unexpectedly (code: ${code})`));
          this.pendingResponse = null;
        }
      });

      this.process.on('error', (error) => {
        console.error(`[Persistent Agent] Process error:`, error);
        reject(error);
      });

      // Wait for process to be ready
      // In persistent mode, we consider it ready after spawning
      setTimeout(() => {
        this.isReady = true;
        this.emit('ready');
        console.log(`[Persistent Agent] Process ready`);
        resolve();
      }, 2000);
    });
  }

  /**
   * Handle output from Claude process
   */
  handleOutput(data) {
    // Add to buffer
    this.responseBuffer += data;

    // Reset idle timer
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    // If we have a pending response, set idle timer
    if (this.pendingResponse) {
      this.idleTimer = setTimeout(() => {
        this.completeResponse();
      }, this.responseIdleMs);
    }
  }

  /**
   * Complete the current response
   */
  completeResponse() {
    if (!this.pendingResponse) return;

    // Clear timers
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }

    // Resolve with buffer content
    const response = this.responseBuffer.trim();
    this.pendingResponse.resolve(response);
    this.pendingResponse = null;
    this.responseBuffer = '';
  }

  /**
   * Send a message to Claude and wait for response
   */
  sendMessage(message) {
    return new Promise((resolve, reject) => {
      if (!this.isReady || !this.process) {
        return reject(new Error('Agent not ready'));
      }

      if (this.pendingResponse) {
        return reject(new Error('Another message is already being processed'));
      }

      console.log(`[Persistent Agent] Sending message (${message.length} chars)`);

      // Set up response handler
      this.pendingResponse = { resolve, reject };
      this.responseBuffer = '';

      // Set timeout
      this.timeoutTimer = setTimeout(() => {
        if (this.pendingResponse) {
          const error = new Error('Execution timeout');
          this.pendingResponse.reject(error);
          this.pendingResponse = null;
          this.responseBuffer = '';

          console.error(`[Persistent Agent] Timeout after ${this.execTimeout}ms`);

          // Kill and respawn the process
          this.kill().then(() => {
            this.spawn().catch(err => {
              console.error(`[Persistent Agent] Failed to respawn after timeout:`, err);
            });
          });
        }
      }, this.execTimeout);

      // Send the message via stdin
      try {
        this.process.stdin.write(message + '\n');
      } catch (error) {
        if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
        this.pendingResponse = null;
        reject(error);
      }
    });
  }

  /**
   * Mark agent as ready
   */
  markReady() {
    this.isReady = true;
    this.emit('ready');
  }

  /**
   * Check if agent is ready
   */
  ready() {
    return this.isReady && this.process !== null;
  }

  /**
   * Kill the process
   */
  kill() {
    return new Promise((resolve) => {
      if (!this.process) {
        return resolve();
      }

      console.log(`[Persistent Agent] Killing process`);

      this.isReady = false;
      this.stopWatchdog();

      // Try graceful shutdown first
      this.process.kill('SIGTERM');

      // Force kill after 5 seconds
      const forceKillTimer = setTimeout(() => {
        if (this.process) {
          console.log(`[Persistent Agent] Force killing process`);
          this.process.kill('SIGKILL');
        }
      }, 5000);

      this.process.once('exit', () => {
        clearTimeout(forceKillTimer);
        this.process = null;
        resolve();
      });
    });
  }

  /**
   * Check if process is alive
   */
  isAlive() {
    return this.process !== null && !this.process.killed;
  }

  /**
   * Start watchdog to monitor process health
   */
  startWatchdog(interval = 30000) {
    if (this.watchdogEnabled) return;

    console.log(`[Persistent Agent] Starting watchdog (interval: ${interval}ms)`);
    this.watchdogEnabled = true;

    this.watchdogInterval = setInterval(() => {
      this.checkHealth();
    }, interval);
  }

  /**
   * Stop watchdog
   */
  stopWatchdog() {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = null;
      this.watchdogEnabled = false;
      console.log(`[Persistent Agent] Watchdog stopped`);
    }
  }

  /**
   * Check process health
   */
  async checkHealth() {
    if (!this.isAlive()) {
      console.warn(`[Persistent Agent] Health check failed: process not alive`);
      this.emit('unhealthy');

      // Attempt to respawn
      try {
        console.log(`[Persistent Agent] Attempting to respawn...`);
        await this.spawn();
      } catch (error) {
        console.error(`[Persistent Agent] Respawn failed:`, error);
      }
    }
  }

  /**
   * Get watchdog status
   */
  getWatchdogStatus() {
    return {
      enabled: this.watchdogEnabled,
      running: this.watchdogInterval !== null,
      interval: this.watchdogInterval ? 30000 : 0,
      crashCount: this.crashCount,
      lastCrashTime: this.lastCrashTime
    };
  }
}

module.exports = PersistentAgentManager;
