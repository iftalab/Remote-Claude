const { query } = require('@anthropic-ai/claude-agent-sdk');
const EventEmitter = require('events');

/**
 * Claude Agent using the official SDK
 *
 * This uses the @anthropic-ai/claude-agent-sdk which properly handles
 * the Claude CLI process, stdin/stdout, and response streaming.
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
  }

  /**
   * Initialize - persona handling skipped for now
   */
  async spawn(initialPrompt = null) {
    console.log(`[Claude Agent SDK] Ready for project in ${this.projectDir}`);

    // Skip persona entirely - let Claude Code work normally
    // If project has PERSONA.md, Claude will read it automatically when needed
    this.persona = null;

    this.isReady = true;
    this.emit('ready');
    return Promise.resolve();
  }

  /**
   * Send a message to Claude and get response
   */
  async sendMessage(message) {
    if (!this.isReady) {
      throw new Error('Agent not ready');
    }

    console.log(`[Claude Agent SDK] Sending message (${message.length} chars)`);

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

      // Call Claude using the SDK
      const response = query({
        prompt: fullPrompt,
        options: {
          cwd: this.projectDir,
          allowedTools: this.claudeTools.split(','),
          dangerouslySkipPermissions: true,
          abortController: this.currentAbortController
        }
      });

      // Collect the response
      let fullResponse = '';
      let toolUseCount = 0;
      let toolResults = [];

      for await (const responseMessage of response) {
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
          // Query complete
          console.log(`[Claude Agent SDK] Got response (${fullResponse.length} chars, ${toolUseCount} tools)`);
          break;
        }
      }

      clearTimeout(timeoutId);
      this.currentAbortController = null;

      // Build final response
      let finalResponse = fullResponse.trim();

      // If no text but tools were used, include tool results
      if (!finalResponse && toolResults.length > 0) {
        finalResponse = '✓ Executed:\n' + toolResults.join('\n');
      }

      // If still no response, use default
      if (!finalResponse) {
        finalResponse = '✓ Task completed';
      }

      return finalResponse;

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
    this.isReady = false;
    console.log(`[Claude Agent SDK] Stopped`);
    return Promise.resolve();
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
