#!/usr/bin/env node
/**
 * Simulate Telegram message flow
 * This mimics exactly what happens when a user sends a Telegram message
 */

const AgentManager = require('./agent');
const { getPersona } = require('./persona');

async function simulateTelegramMessage() {
  console.log('📱 Simulating Telegram Message Flow\n');
  console.log('================================================\n');

  // Simulate project configuration (from projects.json)
  const project = {
    name: 'remote-claude',
    dir: '/Users/ifta/Documents/projects/remote-claude',
    token: 'fake-token',
    // No persona defined, so default will be used
  };

  console.log(`Project: ${project.name}`);
  console.log(`Directory: ${project.dir}\n`);

  // Step 1: Create agent (happens on bot startup)
  console.log('1️⃣ Initializing agent...');
  const agent = new AgentManager(project.dir, {
    execTimeout: 120000,
    claudeTools: 'Bash,Read,Write,Edit,Glob,Grep'
  });
  console.log('   ✅ Agent created\n');

  // Step 2: Get and set persona (happens on bot startup)
  console.log('2️⃣ Loading persona...');
  const persona = getPersona(project);
  agent.setPersona(persona);
  console.log('   ✅ Persona set\n');

  // Step 3: Mark agent as ready (happens on bot startup)
  console.log('3️⃣ Marking agent as ready...');
  agent.markReady();
  console.log('   ✅ Agent ready\n');

  // Step 4: User sends "Hi" from Telegram
  console.log('4️⃣ 📨 User sends "Hi" from Telegram...\n');

  const userMessage = 'Hi';
  const startTime = Date.now();

  try {
    console.log('   🔧 Sending prompt to agent...');
    const response = await agent.sendMessage(userMessage);
    const elapsed = Date.now() - startTime;

    console.log('\n   ✅ Got response in', elapsed, 'ms');
    console.log('\n   📤 Response to user:');
    console.log('   ─────────────────────────────');
    console.log('  ', response.replace(/\n/g, '\n   '));
    console.log('   ─────────────────────────────\n');

  } catch (error) {
    console.error('\n   ❌ ERROR:', error.message);
    process.exit(1);
  }

  // Step 5: User sends another message
  console.log('5️⃣ 📨 User sends "What files are in the current directory?"...\n');

  const userMessage2 = 'List the files in the current directory';
  const startTime2 = Date.now();

  try {
    console.log('   🔧 Sending prompt to agent...');
    const response2 = await agent.sendMessage(userMessage2);
    const elapsed2 = Date.now() - startTime2;

    console.log('\n   ✅ Got response in', elapsed2, 'ms');
    console.log('\n   📤 Response to user:');
    console.log('   ─────────────────────────────');
    console.log('  ', response2.split('\n').slice(0, 10).join('\n   '));
    if (response2.split('\n').length > 10) {
      console.log('   ... (truncated)');
    }
    console.log('   ─────────────────────────────\n');

  } catch (error) {
    console.error('\n   ❌ ERROR:', error.message);
    process.exit(1);
  }

  console.log('================================================');
  console.log('✅ TELEGRAM SIMULATION SUCCESSFUL!');
  console.log('================================================\n');

  console.log('The bot is working correctly. You can now test via Telegram.');
  console.log('\nTo test:');
  console.log('1. Open Telegram');
  console.log('2. Find your bot @ifta_remote_claude_98983434_bot');
  console.log('3. Send "Hi"');
  console.log('4. You should get a response within a few seconds\n');

  process.exit(0);
}

simulateTelegramMessage().catch(error => {
  console.error('\n❌ FATAL ERROR:', error);
  process.exit(1);
});
