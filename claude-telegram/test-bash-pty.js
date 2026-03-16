#!/usr/bin/env node
/**
 * Test script using node-pty with bash wrapper
 * Spawn bash, then run claude inside it
 */

const pty = require('node-pty');

console.log('🧪 Testing PTY via Bash Wrapper\n');

console.log('1️⃣ Spawning Bash via PTY...');

// Spawn bash first with full path
const ptyProcess = pty.spawn('/bin/bash', [], {
  name: 'xterm-256color',
  cols: 120,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

// Handle data
ptyProcess.onData((data) => {
  process.stdout.write(data);
});

// Handle exit
ptyProcess.onExit(({ exitCode, signal }) => {
  console.log(`\n\n❌ Process exited: code=${exitCode}, signal=${signal}`);
  process.exit(exitCode);
});

// Wait 1 second for bash to start
setTimeout(() => {
  console.log('\n\n2️⃣ Running Claude inside bash...');
  ptyProcess.write('claude --dangerously-skip-permissions\n');
}, 1000);

// Wait for Claude to start, then send first message
setTimeout(() => {
  console.log('\n\n3️⃣ Sending first prompt...');
  ptyProcess.write('echo "test message 1"\n');
}, 5000);

// Send second message
setTimeout(() => {
  console.log('\n\n4️⃣ Sending second prompt...');
  ptyProcess.write('pwd\n');
}, 10000);

// Exit Claude
setTimeout(() => {
  console.log('\n\n5️⃣ Exiting Claude...');
  // Try Ctrl+D to exit
  ptyProcess.write('\x04');
}, 15000);

// Cleanup
setTimeout(() => {
  console.log('\n\n6️⃣ Cleaning up...');
  ptyProcess.kill();
  console.log('✅ Test complete');
  process.exit(0);
}, 18000);

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Interrupted by user');
  ptyProcess.kill();
  process.exit(0);
});
