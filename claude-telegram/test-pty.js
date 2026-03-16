#!/usr/bin/env node
/**
 * Test script using node-pty for persistent Claude CLI session
 * This creates a real PTY so Claude thinks it's in a terminal
 */

const pty = require('node-pty');
const os = require('os');

console.log('🧪 Testing PTY-based Claude CLI Session\n');

const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

console.log('1️⃣ Spawning Claude via PTY...');

let outputBuffer = '';
let responseCount = 0;

// Spawn Claude with PTY using full path
const ptyProcess = pty.spawn('/opt/homebrew/bin/claude', [
  '--dangerously-skip-permissions'
], {
  name: 'xterm-256color',
  cols: 120,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

// Handle data
ptyProcess.onData((data) => {
  outputBuffer += data;
  process.stdout.write(data);

  // Simple response detection: look for new prompt
  if (data.includes('>') || data.includes('$') || data.match(/\[\d+m/)) {
    // Might be a prompt
  }
});

// Handle exit
ptyProcess.onExit(({ exitCode, signal }) => {
  console.log(`\n\n❌ Process exited: code=${exitCode}, signal=${signal}`);
  process.exit(exitCode);
});

// Wait 3 seconds for Claude to initialize
setTimeout(() => {
  console.log('\n\n2️⃣ Sending first command...');
  ptyProcess.write('echo "test 1"\n');
}, 3000);

// Send second command
setTimeout(() => {
  console.log('\n\n3️⃣ Sending second command...');
  ptyProcess.write('echo "test 2"\n');
}, 8000);

// Send third command
setTimeout(() => {
  console.log('\n\n4️⃣ Sending third command...');
  ptyProcess.write('pwd\n');
}, 13000);

// Cleanup
setTimeout(() => {
  console.log('\n\n5️⃣ Cleaning up...');
  ptyProcess.write('exit\n');
  setTimeout(() => {
    ptyProcess.kill();
    console.log('✅ Test complete');
    process.exit(0);
  }, 2000);
}, 18000);

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Interrupted by user');
  ptyProcess.kill();
  process.exit(0);
});
