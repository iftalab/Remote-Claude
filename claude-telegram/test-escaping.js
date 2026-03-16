#!/usr/bin/env node

// Test the escaping logic from agent.js

const persona = `You are an AI assistant helping with the "remote-claude" project.

Directory: /Users/ifta/Documents/projects/remote-claude

Your role is to assist with development tasks, answer questions, and help maintain this codebase.

Please respond with "Ready." to confirm you've loaded this context.`;

const message = "Hi";
const fullPrompt = persona + '\n\n' + message;

console.log('=== ORIGINAL PROMPT ===');
console.log(fullPrompt);
console.log('\n=== ESCAPED (current agent.js logic) ===');

const escapedPrompt = fullPrompt
  .replace(/\\/g, '\\\\')
  .replace(/"/g, '\\"')
  .replace(/`/g, '\\`')
  .replace(/\$/g, '\\$');

console.log(escapedPrompt);

const command = `claude -p "${escapedPrompt}" --allowedTools "Bash,Read,Write,Edit,Glob,Grep" --dangerously-skip-permissions`;

console.log('\n=== FULL COMMAND ===');
console.log(command);

console.log('\n=== TESTING COMMAND ===');

const { exec } = require('child_process');

exec(command, {
  timeout: 10000
}, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Command failed:', error.message);
    return;
  }
  console.log('✅ Command succeeded!');
  console.log('Output:', stdout);
});
