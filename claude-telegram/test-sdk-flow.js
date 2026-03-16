#!/usr/bin/env node

/**
 * Test script for SDK-based agent
 */

const path = require('path');
const config = require('./config');
const ClaudeAgent = require('./agent-sdk');

console.log('🧪 Testing Claude Agent SDK Flow\n');
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

// Test 2: Agent initialization
console.log('\n2️⃣  Testing SDK agent initialization...');

async function testAgentInit() {
  const testProject = config.projects[0];

  if (!testProject) {
    console.error('   ✗ No projects configured');
    return false;
  }

  console.log(`   - Testing with project: ${testProject.name}`);
  console.log(`   - Directory: ${testProject.dir}`);

  // Use 10 second timeout for quick iteration
  const agent = new ClaudeAgent(testProject.dir, {
    execTimeout: 10000, // 10 seconds
    claudeTools: config.claudeTools
  });

  try {
    await agent.spawn();
    console.log('   ✓ Agent initialized successfully');

    if (agent.ready()) {
      console.log('   ✓ Agent is ready');
    } else {
      console.error('   ✗ Agent is not ready');
      return false;
    }

    return agent;
  } catch (error) {
    console.error('   ✗ Agent init failed:', error.message);
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
    console.log('   ✓ Agent cleaned up successfully');
  } catch (error) {
    console.error('   ✗ Cleanup failed:', error.message);
  }
}

// Run all tests
async function runTests() {
  let agent = null;

  try {
    // Test agent init
    agent = await testAgentInit();

    if (!agent) {
      console.error('\n❌ FAILED: Agent initialization test failed');
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
    console.log('  1. Agent initializes successfully');
    console.log('  2. Messages can be sent via SDK');
    console.log('  3. Responses are received properly');
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
