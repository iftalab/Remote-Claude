const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

/**
 * Load and validate configuration
 */
function loadConfig() {
  const config = {
    // Parse allowed Telegram user IDs
    allowedIds: parseAllowedIds(process.env.ALLOWED_IDS),

    // Execution timeout for Claude CLI (default: 2 minutes)
    execTimeout: parseInt(process.env.EXEC_TIMEOUT_MS || '120000', 10),

    // Response idle timeout for persistent processes (default: 3 seconds)
    responseIdleMs: parseInt(process.env.RESPONSE_IDLE_MS || '3000', 10),

    // Allowed Claude tools
    claudeTools: process.env.CLAUDE_TOOLS || 'Bash,Read,Write,Edit,Glob,Grep',

    // Load projects configuration
    projects: loadProjects()
  };

  // Validate configuration
  validateConfig(config);

  return config;
}

/**
 * Parse comma-separated list of allowed Telegram user IDs
 */
function parseAllowedIds(idsString) {
  if (!idsString) {
    throw new Error('ALLOWED_IDS is required in .env file');
  }

  return idsString
    .split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0)
    .map(id => parseInt(id, 10));
}

/**
 * Load projects from projects.json
 */
function loadProjects() {
  const projectsPath = path.join(__dirname, 'projects.json');

  if (!fs.existsSync(projectsPath)) {
    throw new Error(
      'projects.json not found. Copy projects.json.example to projects.json and configure your projects.'
    );
  }

  let projectsData;
  try {
    const fileContent = fs.readFileSync(projectsPath, 'utf8');
    projectsData = JSON.parse(fileContent);
  } catch (error) {
    throw new Error(`Failed to parse projects.json: ${error.message}`);
  }

  if (!Array.isArray(projectsData)) {
    throw new Error('projects.json must contain an array of project configurations');
  }

  return projectsData;
}

/**
 * Validate configuration
 */
function validateConfig(config) {
  // Validate allowed IDs
  if (!config.allowedIds || config.allowedIds.length === 0) {
    throw new Error('At least one Telegram user ID must be specified in ALLOWED_IDS');
  }

  // Validate execution timeout
  if (isNaN(config.execTimeout) || config.execTimeout <= 0) {
    throw new Error('EXEC_TIMEOUT_MS must be a positive number');
  }

  // Validate projects
  if (!config.projects || config.projects.length === 0) {
    throw new Error('At least one project must be configured in projects.json');
  }

  // Validate each project
  config.projects.forEach((project, index) => {
    if (!project.name || typeof project.name !== 'string') {
      throw new Error(`Project at index ${index} is missing a valid 'name' field`);
    }

    if (!project.token || typeof project.token !== 'string') {
      throw new Error(`Project '${project.name}' is missing a valid 'token' field`);
    }

    if (!project.dir || typeof project.dir !== 'string') {
      throw new Error(`Project '${project.name}' is missing a valid 'dir' field`);
    }

    // Check if directory exists
    if (!fs.existsSync(project.dir)) {
      console.warn(`Warning: Directory for project '${project.name}' does not exist: ${project.dir}`);
    }
  });

  // Check for duplicate project names
  const projectNames = config.projects.map(p => p.name);
  const duplicateNames = projectNames.filter((name, index) => projectNames.indexOf(name) !== index);
  if (duplicateNames.length > 0) {
    throw new Error(`Duplicate project names found: ${duplicateNames.join(', ')}`);
  }

  // Check for duplicate tokens
  const projectTokens = config.projects.map(p => p.token);
  const duplicateTokens = projectTokens.filter((token, index) => projectTokens.indexOf(token) !== index);
  if (duplicateTokens.length > 0) {
    throw new Error('Duplicate bot tokens found in projects.json');
  }
}

module.exports = loadConfig();
