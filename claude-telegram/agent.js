const { spawn } = require('child_process');
const EventEmitter = require('events');

/**
 * Agent Manager - Manages Claude Code execution (Hybrid Mode)
 *
 * NOTE: Uses exec with -p flag per message instead of persistent process
 * This is a hybrid approach that provides Phase 2 features without true persistence
 * Context is simulated by prepending persona to each request
 */
class AgentManager extends EventEmitter {
  constructor(projectDir, options = {}) {
    super();

    this.projectDir = projectDir;
    this.isReady = false;
    this.execTimeout = options.execTimeout || 120000;
    this.claudeTools = options.claudeTools || 'Bash,Read,Write,Edit,Glob,Grep';
    this.persona = null; // Stored persona to prepend to each message

    // Watchdog configuration (simplified for hybrid mode)
    this.watchdogEnabled = false; // Not needed in hybrid mode
    this.crashCount = 0;
    this.lastCrashTime = null;
  }

  /**
   * Initialize agent (hybrid mode - no actual process spawning)
   */
  spawn() {
    return new Promise((resolve) => {
      console.log(`[Agent] Initializing agent for ${this.projectDir} (hybrid mode)`);
      // No actual spawning in hybrid mode
      // Just mark as ready immediately
      setTimeout(() => {
        console.log(`[Agent] Agent initialized (hybrid mode)`);
        resolve();
      }, 100);
    });
  }

  /**
   * Set persona to be prepended to each message
   */
  setPersona(persona) {
    this.persona = persona;
    console.log(`[Agent] Persona set (${persona ? persona.length : 0} chars)`);
  }

  /**
   * Send a message and get response (hybrid mode - uses spawn with -p flag)
   */
  sendMessage(message) {
    return new Promise((resolve, reject) => {
      console.log(`[Agent] Executing Claude with prompt (${message.length} chars)`);

      // Prepend persona if available
      let fullPrompt = message;
      if (this.persona) {
        fullPrompt = this.persona + '\n\n' + message;
      }

      console.log(`[Agent] Running Claude in ${this.projectDir}`);

      // Use spawn with arguments array - NO escaping needed!
      const proc = spawn('claude', [
        '-p',
        fullPrompt,
        '--allowedTools',
        this.claudeTools,
        '--dangerously-skip-permissions'
      ], {
        cwd: this.projectDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env
      });

      let stdout = '';
      let stderr = '';

      // Collect stdout
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      // Collect stderr
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle exit
      proc.on('exit', (code) => {
        if (code === 0) {
          const output = stdout.trim();
          console.log(`[Agent] Got response (${output.length} chars)`);
          resolve(output);
        } else {
          const error = new Error(`Claude exited with code ${code}: ${stderr || 'no error message'}`);
          console.error(`[Agent] Execution error:`, error.message);
          reject(error);
        }
      });

      // Handle process errors
      proc.on('error', (error) => {
        console.error(`[Agent] Process error:`, error.message);
        reject(error);
      });

      // Timeout handling
      const timeout = setTimeout(() => {
        console.error(`[Agent] Timeout after ${this.execTimeout}ms, killing process`);
        proc.kill('SIGTERM');
        setTimeout(() => proc.kill('SIGKILL'), 1000);
        reject(new Error('Execution timeout'));
      }, this.execTimeout);

      // Clear timeout on exit
      proc.on('exit', () => clearTimeout(timeout));
    });
  }

  /**
   * Mark the agent as ready
   */
  markReady() {
    this.isReady = true;
    this.emit('ready');
    console.log(`[Agent] Marked as ready (hybrid mode)`);
  }

  /**
   * Check if the agent is ready
   */
  ready() {
    return this.isReady;
  }

  /**
   * Kill/cleanup (no-op in hybrid mode)
   */
  kill() {
    return new Promise((resolve) => {
      console.log(`[Agent] Cleanup (hybrid mode - no process to kill)`);
      this.isReady = false;
      resolve();
    });
  }

  /**
   * Check if the agent is alive (always true in hybrid mode when ready)
   */
  isAlive() {
    return this.isReady;
  }

  /**
   * Watchdog methods (no-op in hybrid mode)
   */
  startWatchdog() {
    // No-op in hybrid mode
  }

  stopWatchdog() {
    // No-op in hybrid mode
  }

  checkHealth() {
    // No-op in hybrid mode
  }

  getWatchdogStatus() {
    return {
      enabled: false,
      running: false,
      interval: 0,
      crashCount: this.crashCount,
      lastCrashTime: this.lastCrashTime
    };
  }
}

module.exports = AgentManager;
