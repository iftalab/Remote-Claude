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
   * Initialize with persona file path
   */
  async spawn(initialPrompt = null) {
    console.log(`[Claude Agent SDK] Ready for project in ${this.projectDir}`);

    // Instead of storing the huge persona text, just tell Claude to read PERSONA.md
    if (initialPrompt) {
      this.persona = 'Read and load the PERSONA.md file in the current directory to understand your role and operating guidelines.';
      console.log(`[Claude Agent SDK] Will instruct to read persona file on first message`);
    }

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

    // Use longer timeout for first message (reading persona file), normal timeout otherwise
    const timeout = this.persona ? 45000 : this.execTimeout; // 45s for first message, normal for rest

    if (this.persona) {
      console.log(`[Claude Agent SDK] First message - instructing to read persona file (${timeout/1000}s timeout)`);
    }

    const timeoutId = setTimeout(() => {
      if (this.currentAbortController) {
        console.error(`[Claude Agent SDK] Timeout after ${timeout}ms`);
        this.currentAbortController.abort();
      }
    }, timeout);

    try {
      // Prepend persona to first message if it exists
      const fullPrompt = this.persona ? `${this.persona}\n\n${message}` : message;

      // After first use, clear persona so it's not sent again
      const sendingPersona = !!this.persona;
      this.persona = null;

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
          console.log(`[Claude Agent SDK] Got response (${fullResponse.length} chars, ${toolUseCount} tools)${sendingPersona ? ' [with persona]' : ''}`);
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
