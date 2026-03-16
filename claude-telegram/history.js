const fs = require('fs');
const path = require('path');

/**
 * History Logger
 *
 * Logs conversation history to a JSONL file in the project directory.
 * Each line is a JSON object representing one message.
 */
class HistoryLogger {
  constructor(projectDir, projectName) {
    this.projectDir = projectDir;
    this.projectName = projectName;
    this.historyPath = path.join(projectDir, '.claude-history.jsonl');
  }

  /**
   * Log a message to history
   */
  async log(role, content, metadata = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      role, // 'user' or 'assistant'
      content,
      ...metadata
    };

    try {
      // Append to JSONL file (one JSON object per line)
      const line = JSON.stringify(entry) + '\n';
      await fs.promises.appendFile(this.historyPath, line, 'utf8');
    } catch (error) {
      console.error(`❌ [${this.projectName}] Failed to log history:`, error.message);
    }
  }

  /**
   * Log a user message
   */
  async logUser(content, metadata = {}) {
    return this.log('user', content, metadata);
  }

  /**
   * Log an assistant response
   */
  async logAssistant(content, metadata = {}) {
    return this.log('assistant', content, metadata);
  }

  /**
   * Read all history entries
   */
  async read(limit = 100) {
    try {
      // Check if file exists
      if (!fs.existsSync(this.historyPath)) {
        return [];
      }

      const fileContent = await fs.promises.readFile(this.historyPath, 'utf8');
      const lines = fileContent.trim().split('\n').filter(line => line.length > 0);

      // Parse each line as JSON
      const entries = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (err) {
          console.error(`Failed to parse history line:`, err.message);
          return null;
        }
      }).filter(entry => entry !== null);

      // Return last N entries
      return entries.slice(-limit);
    } catch (error) {
      console.error(`❌ [${this.projectName}] Failed to read history:`, error.message);
      return [];
    }
  }

  /**
   * Clear history
   */
  async clear() {
    try {
      if (fs.existsSync(this.historyPath)) {
        await fs.promises.unlink(this.historyPath);
        console.log(`🗑️ [${this.projectName}] History cleared`);
      }
    } catch (error) {
      console.error(`❌ [${this.projectName}] Failed to clear history:`, error.message);
    }
  }
}

module.exports = HistoryLogger;
