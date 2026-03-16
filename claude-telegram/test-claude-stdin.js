#!/usr/bin/env node

/**
 * Direct test of Claude stdin/stdout communication
 */

const { spawn } = require('child_process');

console.log('Testing Claude stdin/stdout...\n');

const claude = spawn('claude', [
  '--allowedTools', 'Bash,Read,Write,Edit,Glob,Grep',
  '--dangerously-skip-permissions'
], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe']
});

let buffer = '';

claude.stdout.on('data', (data) => {
  const text = data.toString();
  buffer += text;
  console.log('[STDOUT]:', text);
});

claude.stderr.on('data', (data) => {
  console.log('[STDERR]:', data.toString());
});

claude.on('exit', (code, signal) => {
  console.log(`\n[EXIT] Code: ${code}, Signal: ${signal}`);
  process.exit(0);
});

// Wait 2 seconds then send permission bypass
setTimeout(() => {
  console.log('\n[SEND] Sending "2" for permission bypass...');
  claude.stdin.write('2\n');
}, 2000);

// Wait 4 seconds then send a message
setTimeout(() => {
  console.log('\n[SEND] Sending "hi"...');
  claude.stdin.write('hi\n');
}, 4000);

// Kill after 10 seconds
setTimeout(() => {
  console.log('\n[TIMEOUT] Killing process...');
  claude.kill();
}, 10000);
