/**
 * Claude-Telegram Bridge - UI Server
 *
 * Minimal Express server that acts as a file bridge between the React UI and local files.
 * Binds to localhost only for security.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow CORS for local development
app.use(express.json());

// Paths
const PROJECTS_JSON_PATH = path.join(__dirname, '../claude-telegram/projects.json');

// ============================================================================
// API Routes
// ============================================================================

/**
 * GET /api/projects
 * Read and return projects.json
 */
app.get('/api/projects', async (req, res) => {
  try {
    const data = await fs.readFile(PROJECTS_JSON_PATH, 'utf8');
    const projects = JSON.parse(data);
    res.json(projects);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return empty array
      res.json([]);
    } else {
      console.error('Error reading projects.json:', error);
      res.status(500).json({ error: 'Failed to read projects' });
    }
  }
});

/**
 * PUT /api/projects
 * Write updated projects array to projects.json
 */
app.put('/api/projects', async (req, res) => {
  try {
    const projects = req.body;

    // Validate it's an array
    if (!Array.isArray(projects)) {
      return res.status(400).json({ error: 'Projects must be an array' });
    }

    // Create backup before writing
    try {
      const existingData = await fs.readFile(PROJECTS_JSON_PATH, 'utf8');
      const backupPath = `${PROJECTS_JSON_PATH}.backup`;
      await fs.writeFile(backupPath, existingData, 'utf8');
    } catch (error) {
      // Ignore backup errors (file might not exist yet)
    }

    // Write new data
    await fs.writeFile(
      PROJECTS_JSON_PATH,
      JSON.stringify(projects, null, 2),
      'utf8'
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error writing projects.json:', error);
    res.status(500).json({ error: 'Failed to write projects' });
  }
});

/**
 * GET /api/projects/:name/tasks
 * Read TASKS.md from project directory
 */
app.get('/api/projects/:name/tasks', async (req, res) => {
  try {
    const { name } = req.params;

    // Read projects.json to get directory
    const projectsData = await fs.readFile(PROJECTS_JSON_PATH, 'utf8');
    const projects = JSON.parse(projectsData);
    const project = projects.find(p => p.name === name);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Read TASKS.md
    const tasksPath = path.join(project.dir, 'TASKS.md');
    try {
      const tasksContent = await fs.readFile(tasksPath, 'utf8');
      res.json({ content: tasksContent });
    } catch (error) {
      if (error.code === 'ENOENT') {
        // TASKS.md doesn't exist
        res.json({ content: null });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error reading TASKS.md:', error);
    res.status(500).json({ error: 'Failed to read tasks' });
  }
});

/**
 * GET /api/projects/:name/history
 * Read conversation log for project
 */
app.get('/api/projects/:name/history', async (req, res) => {
  try {
    const { name } = req.params;
    const limit = parseInt(req.query.limit) || 100;

    // Read projects.json to get directory
    const projectsData = await fs.readFile(PROJECTS_JSON_PATH, 'utf8');
    const projects = JSON.parse(projectsData);
    const project = projects.find(p => p.name === name);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Read history file
    const historyPath = path.join(project.dir, '.claude-history.jsonl');

    try {
      const historyContent = await fs.readFile(historyPath, 'utf8');
      const lines = historyContent.trim().split('\n').filter(line => line.length > 0);

      // Parse each line as JSON
      const entries = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (err) {
          console.error('Failed to parse history line:', err.message);
          return null;
        }
      }).filter(entry => entry !== null);

      // Return last N entries
      const limitedEntries = entries.slice(-limit);
      res.json(limitedEntries);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // History file doesn't exist yet
        res.json([]);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error reading history:', error);
    res.status(500).json({ error: 'Failed to read history' });
  }
});

/**
 * GET /api/projects/:name/bot-info
 * Fetch Telegram bot info using the bot token
 */
app.get('/api/projects/:name/bot-info', async (req, res) => {
  try {
    const { name } = req.params;

    // Read projects.json to get bot token
    const projectsData = await fs.readFile(PROJECTS_JSON_PATH, 'utf8');
    const projects = JSON.parse(projectsData);
    const project = projects.find(p => p.name === name);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.token) {
      return res.status(400).json({ error: 'No bot token configured' });
    }

    // Call Telegram Bot API
    const telegramUrl = `https://api.telegram.org/bot${project.token}/getMe`;
    const response = await fetch(telegramUrl);
    const data = await response.json();

    if (!data.ok) {
      return res.json({
        status: 'error',
        error: data.description || 'Failed to fetch bot info'
      });
    }

    res.json({
      status: 'success',
      bot: data.result
    });
  } catch (error) {
    console.error('Error fetching bot info:', error);
    res.json({
      status: 'error',
      error: error.message
    });
  }
});

// ============================================================================
// Static file serving (production)
// ============================================================================

// In production: serve static files from the Vite build
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));

  // All other routes serve index.html (client-side routing)
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// ============================================================================
// Start server
// ============================================================================

app.listen(PORT, 'localhost', () => {
  console.log(`🌐 Claude Bridge UI running at http://localhost:${PORT}`);
  console.log(`📁 Projects file: ${PROJECTS_JSON_PATH}`);
  console.log(`🔒 Bound to localhost only (secure)`);
});
