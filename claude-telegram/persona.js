/**
 * Persona Module - Handles persona injection and management
 *
 * Personas are injected into the Claude process stdin at startup,
 * establishing the agent's identity and project context.
 */

const CONFIRMATION_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Inject persona into an agent and wait for confirmation
 *
 * @param {AgentManager} agent - The agent to inject persona into
 * @param {string} persona - The persona text to inject
 * @returns {Promise<string>} The confirmation response from Claude
 */
async function injectPersona(agent, persona) {
  if (!persona || typeof persona !== 'string') {
    throw new Error('Persona must be a non-empty string');
  }

  console.log(`[Persona] Setting persona (${persona.length} chars) - hybrid mode`);

  // In hybrid mode, just store the persona to prepend to each message
  if (agent.setPersona) {
    agent.setPersona(persona);
  }

  // No confirmation needed in hybrid mode - resolve immediately
  console.log(`[Persona] ✅ Persona set (hybrid mode - will be prepended to each message)`);
  return Promise.resolve('Persona set in hybrid mode');
}

/**
 * Load persona from project configuration
 *
 * @param {Object} project - Project configuration object
 * @returns {string|null} The persona text, or null if not defined
 */
function loadPersonaFromProject(project) {
  if (!project) {
    throw new Error('Project configuration is required');
  }

  // Check if persona is defined in project
  if (!project.persona || typeof project.persona !== 'string') {
    console.log(`[Persona] No persona defined for project: ${project.name}`);
    return null;
  }

  console.log(`[Persona] Loaded persona for project: ${project.name}`);
  return project.persona;
}

/**
 * Create default persona for a project
 *
 * @param {Object} project - Project configuration object
 * @returns {string} Default persona text
 */
function createDefaultPersona(project) {
  return `You are an AI assistant helping with the "${project.name}" project.

Directory: ${project.dir}

Your role is to assist with development tasks, answer questions, and help maintain this codebase.

Please respond with "Ready." to confirm you've loaded this context.`;
}

/**
 * Get persona for a project (from config or create default)
 *
 * @param {Object} project - Project configuration object
 * @returns {string} The persona text
 */
function getPersona(project) {
  const persona = loadPersonaFromProject(project);

  if (persona) {
    return persona;
  }

  console.log(`[Persona] Creating default persona for project: ${project.name}`);
  return createDefaultPersona(project);
}

/**
 * Update persona in projects.json
 *
 * @param {string} projectsPath - Path to projects.json file
 * @param {string} projectName - Name of the project to update
 * @param {string} newPersona - New persona text
 */
function updatePersonaInConfig(projectsPath, projectName, newPersona) {
  const fs = require('fs');

  // Read current projects.json
  const projectsData = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));

  // Find and update the project
  const project = projectsData.find(p => p.name === projectName);
  if (!project) {
    throw new Error(`Project not found: ${projectName}`);
  }

  project.persona = newPersona;

  // Write back to file
  fs.writeFileSync(projectsPath, JSON.stringify(projectsData, null, 2), 'utf8');

  console.log(`[Persona] ✅ Updated persona for project: ${projectName}`);
}

module.exports = {
  injectPersona,
  loadPersonaFromProject,
  createDefaultPersona,
  getPersona,
  updatePersonaInConfig,
  CONFIRMATION_TIMEOUT_MS
};
