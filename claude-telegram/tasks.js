/**
 * TASKS.md Management Module
 *
 * Handles detection of task-related signals from Claude's stdout
 * and management of TASKS.md file in the project directory.
 */

const fs = require('fs');
const path = require('path');

// Task state symbols
const TASK_STATES = {
  PENDING: '[ ]',
  IN_PROGRESS: '[-]',
  COMPLETED: '[x]',
  HUMAN_ACTION: '[!]'
};

// Signal patterns to detect in stdout
const SIGNALS = {
  HUMAN_ACTION_REQUIRED: /HUMAN_ACTION_REQUIRED:\s*(.+)/i,
  AWAITING_HUMAN: /AWAITING_HUMAN/i,
  TASK_STARTED: /TASK_STARTED:\s*(.+)/i,
  TASK_COMPLETED: /TASK_COMPLETED:\s*(.+)/i,
  TASK_ADDED: /TASK_ADDED:\s*(.+)/i
};

/**
 * Check stdout for task-related signals
 *
 * @param {string} stdout - The stdout text to analyze
 * @returns {Object} Detected signals with their data
 */
function detectSignals(stdout) {
  const detected = {
    humanActionRequired: null,
    awaitingHuman: false,
    taskStarted: null,
    taskCompleted: null,
    taskAdded: null
  };

  // Check for HUMAN_ACTION_REQUIRED
  const humanActionMatch = stdout.match(SIGNALS.HUMAN_ACTION_REQUIRED);
  if (humanActionMatch) {
    detected.humanActionRequired = humanActionMatch[1].trim();
  }

  // Check for AWAITING_HUMAN
  if (SIGNALS.AWAITING_HUMAN.test(stdout)) {
    detected.awaitingHuman = true;
  }

  // Check for TASK_STARTED
  const taskStartedMatch = stdout.match(SIGNALS.TASK_STARTED);
  if (taskStartedMatch) {
    detected.taskStarted = taskStartedMatch[1].trim();
  }

  // Check for TASK_COMPLETED
  const taskCompletedMatch = stdout.match(SIGNALS.TASK_COMPLETED);
  if (taskCompletedMatch) {
    detected.taskCompleted = taskCompletedMatch[1].trim();
  }

  // Check for TASK_ADDED
  const taskAddedMatch = stdout.match(SIGNALS.TASK_ADDED);
  if (taskAddedMatch) {
    detected.taskAdded = taskAddedMatch[1].trim();
  }

  return detected;
}

/**
 * Read TASKS.md from project directory
 *
 * @param {string} projectDir - Path to project directory
 * @returns {string|null} Contents of TASKS.md, or null if not found
 */
function readTasksFile(projectDir) {
  const tasksPath = path.join(projectDir, 'TASKS.md');

  if (!fs.existsSync(tasksPath)) {
    return null;
  }

  try {
    return fs.readFileSync(tasksPath, 'utf8');
  } catch (error) {
    console.error(`[Tasks] Error reading TASKS.md:`, error.message);
    return null;
  }
}

/**
 * Write TASKS.md to project directory
 *
 * @param {string} projectDir - Path to project directory
 * @param {string} content - Contents to write
 */
function writeTasksFile(projectDir, content) {
  const tasksPath = path.join(projectDir, 'TASKS.md');

  try {
    fs.writeFileSync(tasksPath, content, 'utf8');
    console.log(`[Tasks] Written TASKS.md to ${tasksPath}`);
  } catch (error) {
    console.error(`[Tasks] Error writing TASKS.md:`, error.message);
    throw error;
  }
}

/**
 * Create default TASKS.md template for a project
 *
 * @param {string} projectName - Name of the project
 * @returns {string} Default TASKS.md content
 */
function createDefaultTasksTemplate(projectName) {
  const today = new Date().toISOString().split('T')[0];

  return `# TASKS.md — ${projectName}

**Last Updated:** ${today}

## In Progress

## Pending

## Completed

---

## Task States

- \`[ ]\` - Pending (not yet started)
- \`[-]\` - In Progress (currently working on this)
- \`[x]\` - Completed (done, with date)
- \`[!]\` - Blocked (requires human action)
`;
}

/**
 * Ensure TASKS.md exists in project directory
 *
 * @param {string} projectDir - Path to project directory
 * @param {string} projectName - Name of the project
 * @returns {boolean} True if file exists or was created
 */
function ensureTasksFile(projectDir, projectName) {
  const content = readTasksFile(projectDir);

  if (content === null) {
    console.log(`[Tasks] Creating TASKS.md for project: ${projectName}`);
    const template = createDefaultTasksTemplate(projectName);
    writeTasksFile(projectDir, template);
    return true;
  }

  return true;
}

/**
 * Parse TASKS.md content into structured data
 *
 * @param {string} content - TASKS.md content
 * @returns {Object} Parsed tasks by section
 */
function parseTasks(content) {
  const lines = content.split('\n');
  const tasks = {
    inProgress: [],
    pending: [],
    completed: []
  };

  let currentSection = null;

  for (const line of lines) {
    // Detect section headers
    if (line.match(/^##\s+In Progress/i)) {
      currentSection = 'inProgress';
      continue;
    } else if (line.match(/^##\s+Pending/i)) {
      currentSection = 'pending';
      continue;
    } else if (line.match(/^##\s+Completed/i)) {
      currentSection = 'completed';
      continue;
    } else if (line.match(/^##\s+/)) {
      // Other section, stop parsing tasks
      currentSection = null;
      continue;
    }

    // Parse task lines
    if (currentSection && line.match(/^-\s+\[/)) {
      tasks[currentSection].push(line);
    }
  }

  return tasks;
}

/**
 * Get task counts from TASKS.md
 *
 * @param {string} projectDir - Path to project directory
 * @returns {Object} Task counts by state
 */
function getTaskCounts(projectDir) {
  const content = readTasksFile(projectDir);

  if (!content) {
    return { inProgress: 0, pending: 0, completed: 0, humanAction: 0 };
  }

  const tasks = parseTasks(content);

  // Count human action tasks
  const humanActionCount = [
    ...tasks.inProgress,
    ...tasks.pending
  ].filter(line => line.includes('[!]')).length;

  return {
    inProgress: tasks.inProgress.length,
    pending: tasks.pending.length,
    completed: tasks.completed.length,
    humanAction: humanActionCount
  };
}

/**
 * Format human action alert for Telegram
 *
 * @param {string} projectName - Name of the project
 * @param {string} description - Description of the human task
 * @returns {string} Formatted alert message
 */
function formatHumanActionAlert(projectName, description) {
  return `🚨 *[${projectName}] Human task flagged — continuing with other tasks:*\n\n` +
    `${description}\n\n` +
    `Reply /done <task> when complete.`;
}

/**
 * Format awaiting human message for Telegram
 *
 * @param {string} projectName - Name of the project
 * @returns {string} Formatted message
 */
function formatAwaitingHumanMessage(projectName) {
  return `⏸️ *[${projectName}] All remaining tasks need your input.*\n\n` +
    `Reply /done <task> as you complete each one.`;
}

module.exports = {
  TASK_STATES,
  SIGNALS,
  detectSignals,
  readTasksFile,
  writeTasksFile,
  createDefaultTasksTemplate,
  ensureTasksFile,
  parseTasks,
  getTaskCounts,
  formatHumanActionAlert,
  formatAwaitingHumanMessage
};
