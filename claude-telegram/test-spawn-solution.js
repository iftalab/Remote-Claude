#!/usr/bin/env node

// Test the correct way to handle this - use spawn with args array

const { spawn } = require('child_process');

const persona = `You are an AI assistant helping with the "remote-claude" project.

Directory: /Users/ifta/Documents/projects/remote-claude

Your role is to assist with development tasks, answer questions, and help maintain this codebase.

Please respond with "Ready." to confirm you've loaded this context.`;

const message = "Hi";
const fullPrompt = persona + '\n\n' + message;

console.log('=== TESTING SPAWN WITH ARGS ARRAY ===\n');

// Use spawn with arguments array - NO escaping needed!
const proc = spawn('claude', [
  '-p',
  fullPrompt,  // Pass the prompt directly as an argument
  '--allowedTools',
  'Bash,Read,Write,Edit,Glob,Grep',
  '--dangerously-skip-permissions'
], {
  cwd: '/Users/ifta/Documents/projects/remote-claude',
  stdio: ['ignore', 'pipe', 'pipe']
});

let stdout = '';
let stderr = '';

proc.stdout.on('data', (data) => {
  stdout += data.toString();
});

proc.stderr.on('data', (data) => {
  stderr += data.toString();
});

proc.on('exit', (code) => {
  if (code === 0) {
    console.log('✅ Command succeeded!');
    console.log('\nOutput:');
    console.log(stdout);
  } else {
    console.error('❌ Command failed with code:', code);
    console.error('stderr:', stderr);
  }
  process.exit(code || 0);
});

proc.on('error', (error) => {
  console.error('❌ Process error:', error);
  process.exit(1);
});

// Timeout after 15 seconds
setTimeout(() => {
  console.error('⏱️  Timeout - killing process');
  proc.kill();
  process.exit(1);
}, 15000);
