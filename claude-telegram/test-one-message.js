#!/usr/bin/env node

const ClaudeAgent = require('./agent-sdk');

async function test() {
  const agent = new ClaudeAgent('/Users/ifta/Documents/projects/remote-claude', {
    execTimeout: 10000,
    claudeTools: 'Bash,Read,Write,Edit,Glob,Grep'
  });

  await agent.spawn();

  console.log('\nSending message: "hi"\n');

  const response = await agent.sendMessage('hi');

  console.log('\nFinal response:', response);

  await agent.kill();
  process.exit(0);
}

test().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
