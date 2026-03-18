#!/usr/bin/env node
/**
 * Test Session Continuity
 *
 * This script tests that Claude Code maintains conversation context across messages.
 *
 * Test flow:
 * 1. Send "first message" to Claude
 * 2. Wait for response
 * 3. Send "what was my last message"
 * 4. Verify Claude responds with "first message"
 */

const ClaudeAgent = require('./agent-sdk');
const path = require('path');

const TEST_PROJECT_DIR = process.cwd();

async function runTest() {
  console.log('🧪 Testing Session Continuity\n');
  console.log(`Project Directory: ${TEST_PROJECT_DIR}\n`);

  // Create agent
  const agent = new ClaudeAgent(TEST_PROJECT_DIR, {
    execTimeout: 120000,
    claudeTools: 'Bash,Read,Write,Edit,Glob,Grep'
  });

  // Spawn agent
  console.log('1️⃣  Spawning agent...');
  await agent.spawn();
  console.log('✅ Agent ready\n');

  try {
    // First message with unique identifier
    console.log('2️⃣  Sending first message: "My favorite color is purple"');
    const result1 = await agent.sendMessage('My favorite color is purple');
    console.log('📤 Claude response:');
    console.log(result1.response);
    console.log(`📋 Session ID: ${result1.sessionId}`);
    console.log();

    // Second message - test recall (using same agent, should auto-continue)
    console.log('3️⃣  Sending second message: "What did I say my favorite color was?"');
    const result2 = await agent.sendMessage('What did I say my favorite color was?');
    console.log('📤 Claude response:');
    console.log(result2.response);
    console.log(`📋 Session ID: ${result2.sessionId}`);
    console.log();

    // Verify - should contain "purple"
    const response2Lower = result2.response.toLowerCase();
    const hasPurple = response2Lower.includes('purple');

    if (hasPurple) {
      console.log('✅ TEST PASSED: Claude remembered the previous message!');
      console.log('🎉 Session continuity is working correctly.\n');
      process.exit(0);
    } else {
      console.log('❌ TEST FAILED: Claude did not remember the previous message.');
      console.log('💡 Expected "purple" in response but got:');
      console.log(result2.response);
      console.log('\n💡 Session continuity is NOT working.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
    process.exit(1);
  } finally {
    await agent.kill();
  }
}

// Run test
runTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
