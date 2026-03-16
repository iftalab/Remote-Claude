#!/usr/bin/env node
/**
 * Test script for persistent Claude CLI session
 * Tests --input-format stream-json mode
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing Persistent Claude CLI Session\n');

// Spawn Claude with stream-json mode
console.log('1️⃣ Spawning Claude in stream-json mode...');
const proc = spawn('claude', [
  '--input-format', 'stream-json',
  '--output-format', 'stream-json',
  '--dangerously-skip-permissions'
], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe'],
  env: process.env
});

let stdoutBuffer = '';
let stderrBuffer = '';

// Handle stdout
proc.stdout.on('data', (data) => {
  const chunk = data.toString();
  stdoutBuffer += chunk;
  process.stdout.write(chunk);

  // Try to parse JSON lines
  const lines = stdoutBuffer.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    if (line) {
      try {
        const msg = JSON.parse(line);
        console.log('\n📦 Received JSON:', JSON.stringify(msg, null, 2));
      } catch (e) {
        console.log('\n📝 Non-JSON output:', line);
      }
    }
  }
  stdoutBuffer = lines[lines.length - 1];
});

// Handle stderr
proc.stderr.on('data', (data) => {
  stderrBuffer += data.toString();
  console.error('⚠️  stderr:', data.toString());
});

// Handle exit
proc.on('exit', (code, signal) => {
  console.log(`\n\n❌ Process exited: code=${code}, signal=${signal}`);
  console.log('stdout buffer:', stdoutBuffer);
  console.log('stderr buffer:', stderrBuffer);
});

// Handle errors
proc.on('error', (error) => {
  console.error('❌ Process error:', error);
  process.exit(1);
});

// Wait for process to start
setTimeout(() => {
  console.log('\n2️⃣ Sending test message...');

  // Send a message in JSON format
  const message = {
    type: 'message',
    content: 'Say "Hello from persistent session!" and nothing else.'
  };

  try {
    proc.stdin.write(JSON.stringify(message) + '\n');
    console.log('✅ Message sent:', message);
  } catch (error) {
    console.error('❌ Failed to send message:', error);
    proc.kill();
    process.exit(1);
  }
}, 2000);

// Wait to see response, then send another message
setTimeout(() => {
  console.log('\n3️⃣ Sending second test message...');

  const message2 = {
    type: 'message',
    content: 'Count to 3 and say done.'
  };

  try {
    proc.stdin.write(JSON.stringify(message2) + '\n');
    console.log('✅ Second message sent:', message2);
  } catch (error) {
    console.error('❌ Failed to send second message:', error);
  }
}, 10000);

// Cleanup after 20 seconds
setTimeout(() => {
  console.log('\n4️⃣ Cleaning up...');
  proc.kill('SIGTERM');
  setTimeout(() => {
    console.log('✅ Test complete');
    process.exit(0);
  }, 1000);
}, 20000);

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Interrupted by user');
  proc.kill('SIGTERM');
  setTimeout(() => process.exit(0), 500);
});
