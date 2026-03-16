#!/usr/bin/env node

/**
 * Test script for core Telegram → Claude → Telegram flow
 *
 * This tests:
 * 1. Bot configuration loading
 * 2. Persistent agent spawning
 * 3. Message sending via stdin
 * 4. Response receiving via stdout
 * 5. Full flow simulation
 */

const path = require('path');
const config = require('./config');
const PersistentAgentManager = require('./agent-persistent');

console.log('🧪 Testing Core Flow\n');
console.log('='.repeat(60));

// Test 1: Configuration
console.log('\n1️⃣  Testing configuration loading...');
try {
  console.log('   ✓ Loaded configuration');
  console.log(`   - Allowed IDs: ${config.allowedIds.join(', ')}`);
  console.log(`   - Exec timeout: ${config.execTimeout}ms`);
  console.log(`   - Projects: ${config.projects.length}`);
} catch (error) {
  console.error('   ✗ Configuration failed:', error.message);
  process.exit(1);
}

// Test 2: Agent spawning
console.log('\n2️⃣  Testing persistent agent spawn...');

async function testAgentSpawn() {
  const testProject = config.projects[0];

  if (!testProject) {
    console.error('   ✗ No projects configured');
    return false;
  }

  console.log(`   - Testing with project: ${testProject.name}`);
  console.log(`   - Directory: ${testProject.dir}`);

  const agent = new PersistentAgentManager(testProject.dir, {
    execTimeout: config.execTimeout,
    responseIdleMs: config.responseIdleMs,
    claudeTools: config.claudeTools
  });

  try {
    // Spawn without persona for test
    console.log('   - Spawning Claude process...');
    await agent.spawn();
    console.log('   ✓ Agent spawned successfully');

    // Check if process is alive
    if (agent.isAlive()) {
      console.log('   ✓ Agent process is alive');
    } else {
      console.error('   ✗ Agent process is not alive');
      return false;
    }

    return agent;
  } catch (error) {
    console.error('   ✗ Agent spawn failed:', error.message);
    return false;
  }
}

// Test 3: Message sending and receiving
async function testMessageFlow(agent) {
  console.log('\n3️⃣  Testing message send/receive...');

  const testMessages = [
    'hi',
    'what is 2+2?',
    'list files in current directory'
  ];

  for (const testMsg of testMessages) {
    console.log(`\n   📤 Sending: "${testMsg}"`);

    try {
      const startTime = Date.now();
      const response = await agent.sendMessage(testMsg);
      const elapsed = Date.now() - startTime;

      console.log(`   ✓ Got response in ${elapsed}ms`);
      console.log(`   - Response length: ${response.length} chars`);

      // Show first 200 chars of response
      const preview = response.substring(0, 200).replace(/\n/g, ' ');
      console.log(`   - Preview: ${preview}${response.length > 200 ? '...' : ''}`);

      // If response is empty, that's a problem
      if (!response || response.trim().length === 0) {
        console.error('   ⚠️  WARNING: Response is empty!');
        return false;
      }

    } catch (error) {
      console.error(`   ✗ Message failed:`, error.message);
      console.error(`   - Stack: ${error.stack}`);
      return false;
    }
  }

  return true;
}

// Test 4: Cleanup
async function cleanup(agent) {
  console.log('\n4️⃣  Cleaning up...');

  try {
    await agent.kill();
    console.log('   ✓ Agent killed successfully');
  } catch (error) {
    console.error('   ✗ Cleanup failed:', error.message);
  }
}

// Run all tests
async function runTests() {
  let agent = null;

  try {
    // Test agent spawn
    agent = await testAgentSpawn();

    if (!agent) {
      console.error('\n❌ FAILED: Agent spawn test failed');
      process.exit(1);
    }

    // Test message flow
    const messageTestPassed = await testMessageFlow(agent);

    if (!messageTestPassed) {
      console.error('\n❌ FAILED: Message flow test failed');
      await cleanup(agent);
      process.exit(1);
    }

    // Cleanup
    await cleanup(agent);

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('\nCore flow is working:');
    console.log('  1. Agent spawns successfully');
    console.log('  2. Messages can be sent via stdin');
    console.log('  3. Responses are received via stdout');
    console.log('\nThe bot should work correctly now.');
    console.log('='.repeat(60));

    process.exit(0);

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    if (agent) {
      await cleanup(agent);
    }
    process.exit(1);
  }
}

// Run tests
runTests();
