/**
 * Simple test for AgentManager
 * Run with: node test-agent.js
 */
const AgentManager = require('./agent');
const path = require('path');

async function testAgent() {
  console.log('🧪 Testing AgentManager...\n');

  // Use current directory as test project
  const projectDir = process.cwd();
  console.log(`Project directory: ${projectDir}\n`);

  // Create agent
  const agent = new AgentManager(projectDir, { responseIdleMs: 3000 });

  // Listen to events
  agent.on('stdout', (data) => {
    process.stdout.write(data);
  });

  agent.on('stderr', (data) => {
    process.stderr.write(data);
  });

  agent.on('exit', ({ code, signal }) => {
    console.log(`\n\n❌ Process exited unexpectedly: code=${code}, signal=${signal}`);
    process.exit(1);
  });

  try {
    // Spawn the process
    console.log('1️⃣ Spawning Claude process...');
    await agent.spawn();
    console.log('✅ Process spawned\n');

    // Wait a bit for Claude to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Send a simple message
    console.log('\n2️⃣ Sending test message...');
    const response = await agent.sendMessage('echo "Hello from test!"');
    console.log('\n✅ Got response:');
    console.log('---');
    console.log(response);
    console.log('---\n');

    // Kill the process
    console.log('3️⃣ Killing process...');
    await agent.kill();
    console.log('✅ Process killed\n');

    console.log('✅ All tests passed!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await agent.kill();
    process.exit(1);
  }
}

// Run test
testAgent().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
