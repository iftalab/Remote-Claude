#!/usr/bin/env node
/**
 * Test script for interactive Claude CLI session
 * Try spawning without stream-json, just regular interactive mode
 */

const { spawn } = require('child_process');
const readline = require('readline');

console.log('🧪 Testing Interactive Claude CLI Session\n');

// Spawn Claude in regular interactive mode
console.log('1️⃣ Spawning Claude in interactive mode...');
const proc = spawn('claude', [
  '--dangerously-skip-permissions'
], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    // Try to force it to think it's in a TTY
    TERM: 'xterm-256color'
  }
});

let stdoutBuffer = '';
let lineCount = 0;

// Handle stdout - just echo everything
proc.stdout.on('data', (data) => {
  const text = data.toString();
  stdoutBuffer += text;
  lineCount++;

  console.log(`\n📤 [stdout #${lineCount}]:`);
  console.log(text);
  console.log('---');
});

// Handle stderr
proc.stderr.on('data', (data) => {
  console.error('\n⚠️  [stderr]:', data.toString());
});

// Handle exit
proc.on('exit', (code, signal) => {
  console.log(`\n\n❌ Process exited: code=${code}, signal=${signal}`);
  process.exit(code || 0);
});

// Handle errors
proc.on('error', (error) => {
  console.error('❌ Process error:', error);
  process.exit(1);
});

// Wait 3 seconds then send first message
setTimeout(() => {
  console.log('\n2️⃣ Sending first message...');
  const msg1 = 'echo "test message 1"\n';
  proc.stdin.write(msg1);
  console.log('✅ Sent:', msg1.trim());
}, 3000);

// Wait 10 seconds then send second message
setTimeout(() => {
  console.log('\n3️⃣ Sending second message...');
  const msg2 = 'echo "test message 2"\n';
  proc.stdin.write(msg2);
  console.log('✅ Sent:', msg2.trim());
}, 10000);

// Cleanup after 20 seconds
setTimeout(() => {
  console.log('\n4️⃣ Cleaning up...');
  proc.kill('SIGTERM');
  setTimeout(() => process.exit(0), 1000);
}, 20000);

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Interrupted by user');
  proc.kill('SIGTERM');
  setTimeout(() => process.exit(0), 500);
});
