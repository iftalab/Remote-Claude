const { query } = require('@anthropic-ai/claude-agent-sdk');
const { spawn } = require('child_process');
const EventEmitter = require('events');

/**
 * Claude Agent using the official SDK with process persistence
 *
 * This uses the @anthropic-ai/claude-agent-sdk which properly handles
 * the Claude CLI process, stdin/stdout, and response streaming.
 *
 * Enhanced with process ID tracking and reconnection capabilities.
 */
class ClaudeAgent extends EventEmitter {
  constructor(projectDir, options = {}) {
    super();

    this.projectDir = projectDir;
    this.isReady = true; // SDK handles initialization
    this.execTimeout = options.execTimeout || 300000;
    this.claudeTools = options.claudeTools || 'Bash,Read,Write,Edit,Glob,Grep';
    this.persona = null;
    this.currentAbortController = null;
    this.processId = null; // Track the Claude Code process ID
    this.persistentProcess = null; // For direct process management
    this.sessionId = null; // Track session ID for conversation continuity
    this.hasSession = false; // Track if we have an active session
  }

  /**
   * Initialize - persona handling skipped for now
   *
   * @param {string|null} _initialPrompt - Optional initial prompt (persona) - not used in SDK mode
   * @param {number|null} existingPid - Optional existing process ID to reconnect to
   */
  async spawn(_initialPrompt = null, existingPid = null) {
    console.log(`[Claude Agent SDK] Ready for project in ${this.projectDir}`);

    // Try to reconnect to existing process if PID provided
    if (existingPid) {
      const reconnected = await this.tryReconnect(existingPid);
      if (reconnected) {
        console.log(`[Claude Agent SDK] Reconnected to existing process ${existingPid}`);
        this.isReady = true;
        this.emit('ready');
        this.emit('reconnected', { processId: existingPid });
        return Promise.resolve();
      } else {
        console.log(`[Claude Agent SDK] Could not reconnect to process ${existingPid}, will spawn new`);
      }
    }

    // Skip persona entirely - let Claude Code work normally
    // If project has PERSONA.md, Claude will read it automatically when needed
    this.persona = null;

    this.isReady = true;
    this.emit('ready');
    return Promise.resolve();
  }

  /**
   * Try to reconnect to an existing Claude Code process
   * @param {number} pid - Process ID to reconnect to
   * @returns {Promise<boolean>} - True if reconnection successful
   */
  async tryReconnect(pid) {
    try {
      // Check if process exists and is a Claude Code process
      const isRunning = await this.isProcessRunning(pid);
      if (!isRunning) {
        console.log(`[Claude Agent SDK] Process ${pid} is not running`);
        return false;
      }

      // Verify it's a Claude Code process
      const isClaudeProcess = await this.isClaudeCodeProcess(pid);
      if (!isClaudeProcess) {
        console.log(`[Claude Agent SDK] Process ${pid} is not a Claude Code process`);
        return false;
      }

      // Store the PID
      this.processId = pid;
      console.log(`[Claude Agent SDK] Successfully verified process ${pid}`);
      return true;

    } catch (error) {
      console.error(`[Claude Agent SDK] Error reconnecting to process ${pid}:`, error.message);
      return false;
    }
  }

  /**
   * Check if a process is running
   * @param {number} pid - Process ID
   * @returns {Promise<boolean>}
   */
  async isProcessRunning(pid) {
    return new Promise((resolve) => {
      try {
        // Send signal 0 to check if process exists (doesn't actually send a signal)
        process.kill(pid, 0);
        resolve(true);
      } catch (error) {
        resolve(false);
      }
    });
  }

  /**
   * Check if a process is a Claude Code process
   * @param {number} pid - Process ID
   * @returns {Promise<boolean>}
   */
  async isClaudeCodeProcess(pid) {
    return new Promise((resolve) => {
      // Use ps command to get process command line
      const psProcess = spawn('ps', ['-p', pid, '-o', 'command=']);
      let output = '';

      psProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      psProcess.on('close', (code) => {
        if (code !== 0) {
          resolve(false);
          return;
        }

        // Check if command contains 'claude' (case insensitive)
        const isClaudeCode = output.toLowerCase().includes('claude');
        resolve(isClaudeCode);
      });

      psProcess.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Get the current process ID (if tracked)
   * @returns {number|null}
   */
  getProcessId() {
    return this.processId;
  }

  /**
   * Send a message to Claude and get response
   * @param {string} message - The message to send
   * @param {string|null} sessionId - Optional session ID to resume (for multi-chat support)
   */
  async sendMessage(message, sessionId = null) {
    if (!this.isReady) {
      throw new Error('Agent not ready');
    }

    console.log(`[Claude Agent SDK] Sending message (${message.length} chars)`);

    // Determine which session to use
    const targetSessionId = sessionId || this.sessionId;

    // Log session continuity
    if (targetSessionId) {
      console.log(`[Claude Agent SDK] Resuming session: ${targetSessionId}`);
    } else if (this.hasSession) {
      console.log(`[Claude Agent SDK] Continuing existing session`);
    } else {
      console.log(`[Claude Agent SDK] Starting new session`);
    }

    // Create abort controller for timeout
    this.currentAbortController = new AbortController();

    const timeoutId = setTimeout(() => {
      if (this.currentAbortController) {
        console.error(`[Claude Agent SDK] Timeout after ${this.execTimeout}ms`);
        this.currentAbortController.abort();
      }
    }, this.execTimeout);

    try {
      // Just send the message - no persona handling
      const fullPrompt = message;

      // Build query options
      const queryOptions = {
        cwd: this.projectDir,
        allowedTools: this.claudeTools.split(','),
        dangerouslySkipPermissions: true,
        abortController: this.currentAbortController
      };

      // Use resume with session ID if provided (for multi-chat)
      if (targetSessionId) {
        queryOptions.resume = targetSessionId;
      }
      // Use continue: true to resume the most recent session (for single-chat)
      else if (this.hasSession) {
        queryOptions.continue = true;
      }

      // Call Claude using the SDK
      const response = query({
        prompt: fullPrompt,
        options: queryOptions
      });

      // Collect the response
      let fullResponse = '';
      let toolUseCount = 0;
      let toolResults = [];

      let capturedSessionId = null;

      for await (const responseMessage of response) {
        // Capture session ID from system init message
        if (responseMessage.type === 'system' && responseMessage.subtype === 'init') {
          if (responseMessage.session_id) {
            capturedSessionId = responseMessage.session_id;
            this.sessionId = capturedSessionId;
            this.hasSession = true;
            console.log(`[Claude Agent SDK] Session ID captured: ${capturedSessionId}`);
          }
        }

        if (responseMessage.type === 'assistant' && responseMessage.message) {
          // Collect assistant text responses from message.content
          const content = responseMessage.message.content || [];
          for (const block of content) {
            if (block.type === 'text') {
              fullResponse += block.text + '\n';
            } else if (block.type === 'tool_use') {
              toolUseCount++;
            }
          }
        } else if (responseMessage.type === 'tool_result') {
          // Collect tool results
          if (responseMessage.content && Array.isArray(responseMessage.content)) {
            for (const block of responseMessage.content) {
              if (block.type === 'text') {
                toolResults.push(block.text);
              }
            }
          }
        } else if (responseMessage.type === 'result') {
          // Also capture session ID from result message
          if (responseMessage.session_id) {
            capturedSessionId = responseMessage.session_id;
            this.sessionId = capturedSessionId;
            this.hasSession = true;
          }

          // Query complete
          console.log(`[Claude Agent SDK] Got response (${fullResponse.length} chars, ${toolUseCount} tools)`);
          break;
        }
      }

      clearTimeout(timeoutId);
      this.currentAbortController = null;

      // Build final response
      let finalResponse = fullResponse.trim();

      // Return both response and session ID
      const result = {
        response: finalResponse,
        sessionId: capturedSessionId || this.sessionId
      };

      // If no text but tools were used, include tool results
      if (!finalResponse && toolResults.length > 0) {
        result.response = '✓ Executed:\n' + toolResults.join('\n');
      }

      // If still no response, use default
      if (!result.response) {
        result.response = '✓ Task completed';
      }

      return result;

    } catch (error) {
      clearTimeout(timeoutId);
      this.currentAbortController = null;

      if (error.name === 'AbortError') {
        throw new Error('Execution timeout');
      }

      throw error;
    }
  }

  /**
   * Mark agent as ready
   */
  markReady() {
    this.isReady = true;
  }

  /**
   * Check if agent is ready
   */
  ready() {
    return this.isReady;
  }

  /**
   * Kill the process (no-op for SDK, just reset state)
   */
  async kill() {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
    this.processId = null; // Clear process ID
    this.sessionId = null; // Clear session ID
    this.hasSession = false; // Clear session flag
    this.isReady = false;
    console.log(`[Claude Agent SDK] Stopped`);
    return Promise.resolve();
  }

  /**
   * Reset session (start a new conversation)
   */
  resetSession() {
    this.sessionId = null;
    this.hasSession = false;
    console.log(`[Claude Agent SDK] Session reset - next message will start new session`);
  }

  /**
   * Get current session ID
   * @returns {string|null}
   */
  getSessionId() {
    return this.sessionId;
  }

  /**
   * Check if process is alive (always true for SDK)
   */
  isAlive() {
    return this.isReady;
  }

  /**
   * Watchdog methods (no-op for SDK)
   */
  startWatchdog() {}
  stopWatchdog() {}
  checkHealth() {}
  getWatchdogStatus() {
    return {
      enabled: false,
      running: false,
      interval: 0,
      crashCount: 0,
      lastCrashTime: null
    };
  }
}

module.exports = ClaudeAgent;
