#!/usr/bin/env node

const ClaudeAgent = require('./agent-sdk');

async function test() {
  console.log('Testing Mini SaaS agent with persona file...\n');

  const agent = new ClaudeAgent('/Users/ifta/Documents/projects/Mini-SaaS-One', {
    execTimeout: 30000,
    claudeTools: 'Bash,Read,Write,Edit,Glob,Grep'
  });

  // Simulate persona instruction
  await agent.spawn('persona-will-be-here');

  console.log('Sending first message with persona file instruction...');
  const startTime = Date.now();

  try {
    const response = await agent.sendMessage('hi');
    const elapsed = Date.now() - startTime;

    console.log(`\n✅ Success in ${elapsed}ms`);
    console.log(`Response: ${response.substring(0, 200)}...`);
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.log(`\n❌ Failed after ${elapsed}ms`);
    console.log(`Error: ${error.message}`);
  }

  await agent.kill();
  process.exit(0);
}

test().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
