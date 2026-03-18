/**
 * API Client for Claude-Telegram Bridge UI
 *
 * Provides functions to interact with the Express file bridge server.
 * All functions return promises and handle errors gracefully.
 */

const API_BASE = '/api';

/**
 * Get all projects from projects.json
 * @returns {Promise<Array>} Array of project objects
 */
export async function getProjects() {
  const response = await fetch(`${API_BASE}/projects`);
  if (!response.ok) {
    throw new Error(`Failed to fetch projects: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Update projects.json with new data
 * @param {Array} projects - Array of project objects
 * @returns {Promise<Object>} Success response
 */
export async function updateProjects(projects) {
  const response = await fetch(`${API_BASE}/projects`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(projects),
  });

  if (!response.ok) {
    throw new Error(`Failed to update projects: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get TASKS.md content for a specific project
 * @param {string} projectName - Name of the project
 * @returns {Promise<Object>} Object with content property (null if file doesn't exist)
 */
export async function getTasks(projectName) {
  const response = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectName)}/tasks`);
  if (!response.ok) {
    throw new Error(`Failed to fetch tasks: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get conversation history for a specific project
 * @param {string} projectName - Name of the project
 * @returns {Promise<Array>} Array of message objects
 */
export async function getHistory(projectName) {
  const response = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectName)}/history`);
  if (!response.ok) {
    throw new Error(`Failed to fetch history: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get Telegram bot info for a specific project
 * @param {string} projectName - Name of the project
 * @returns {Promise<Object>} Bot info object with status and bot details
 */
export async function getBotInfo(projectName) {
  const response = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectName)}/bot-info`);
  if (!response.ok) {
    throw new Error(`Failed to fetch bot info: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get all running Claude Code processes on the system
 * @returns {Promise<Array>} Array of process objects with pid, command, and cwd
 */
export async function getRunningProcesses() {
  const response = await fetch(`${API_BASE}/processes`);
  if (!response.ok) {
    throw new Error(`Failed to fetch processes: ${response.statusText}`);
  }
  return response.json();
}
