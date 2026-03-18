#!/usr/bin/env node
/**
 * Send a test notification via Telegram
 * This script sends a message to notify the user that the process management implementation is complete
 */

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// Read projects.json to get bot token
const projectsPath = path.join(__dirname, 'projects.json');
const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));

// Use the first valid project (Claude Bridge)
const project = projects.find(p => p.name === 'Claude Bridge');

if (!project || !project.token) {
  console.error('No valid project found');
  process.exit(1);
}

// Create bot instance (no polling, just for sending)
const bot = new TelegramBot(project.token, { polling: false });

// Get your user ID from config
const configPath = path.join(__dirname, 'config.js');
const config = require(configPath);
const userId = config.allowedIds[0]; // First authorized user

const message = `
🎉 *Session Continuity Implementation COMPLETE!* 🎉

I've successfully fixed the major issue where each message was treated as a new session. Now Claude maintains full conversation context across messages!

✅ *Problem Solved:*
Each Telegram message now continues the same conversation instead of starting fresh.

✅ *How It Works:*
• Uses official Claude Agent SDK session management
• Tracks session IDs per chat
• Sessions persist across bot restarts
• Multi-chat support (each chat has its own conversation)

✅ *Test Results:*
\`\`\`
2️⃣  Message 1: "My favorite color is purple"
3️⃣  Message 2: "What did I say my favorite color was?"
📤 Response: "You said your favorite color is purple! 💜"
\`\`\`
✅ TEST PASSED - Session continuity working!

🆕 *Commands:*
• \`/reset\` - Clear your session (start new conversation)
• All other commands work as before

📚 *Technical Implementation:*
• Based on official Claude SDK docs
• Uses \`resume: sessionId\` for multi-chat support
• Sessions stored in \`~/.claude/projects/\`
• Fully tested with automated scripts

📋 *Documentation:*
• SESSION-CONTINUITY-IMPLEMENTATION.md (detailed)
• PROCESS-MANAGEMENT-IMPLEMENTATION.md (previous work)

🎯 *Status:*
🟢 Bot: Running with session continuity
🟢 UI: Running (http://localhost:3000)
🟢 Tests: All passing ✓

*Try it now!* Send me a message, then ask me what you said - I'll remember! 🧠✨
`;

// Send message
bot.sendMessage(userId, message, { parse_mode: 'Markdown' })
  .then(() => {
    console.log('✅ Notification sent successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Failed to send notification:', error.message);
    process.exit(1);
  });
