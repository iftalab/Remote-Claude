#!/usr/bin/env node
/**
 * Test Session Continuity via Telegram
 *
 * This script simulates sending messages via Telegram bot to test session continuity
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
const chatId = config.allowedIds[0]; // First authorized user

async function sendAndWait(message, delayMs = 5000) {
  console.log(`\n📤 Sending: "${message}"`);
  await bot.sendMessage(chatId, message);
  console.log(`⏳ Waiting ${delayMs / 1000}s for response...`);
  await new Promise(resolve => setTimeout(resolve, delayMs));
}

async function runTest() {
  console.log('🧪 Testing Session Continuity via Telegram\n');
  console.log(`Bot: ${project.name}`);
  console.log(`Chat ID: ${chatId}\n`);

  try {
    // Send test message
    await sendAndWait('My favorite fruit is mango', 10000);

    // Ask recall question
    await sendAndWait('What did I say my favorite fruit was?', 10000);

    console.log('\n✅ Test messages sent!');
    console.log('📱 Please check your Telegram to see if Claude remembered "mango"');
    console.log('\nIf Claude responds with "mango", session continuity is working! 🎉');
    console.log('If Claude says it doesn\'t remember, session continuity needs fixing.');

  } catch (error) {
    console.error('❌ Test error:', error.message);
    process.exit(1);
  }
}

// Run test
runTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
