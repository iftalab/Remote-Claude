#!/usr/bin/env node
/**
 * Final comprehensive test for the fixed agent
 * Tests the actual AgentManager implementation
 */

const AgentManager = require('./agent');
const path = require('path');

async function runTests() {
  console.log('🧪 Final Comprehensive Test\n');
  console.log('================================================\n');

  const projectDir = '/Users/ifta/Documents/projects/remote-claude';

  // Test 1: Create agent
  console.log('Test 1: Creating AgentManager...');
  const agent = new AgentManager(projectDir, {
    execTimeout: 30000,
    claudeTools: 'Bash,Read,Write,Edit,Glob,Grep'
  });
  console.log('✅ Agent created\n');

  // Test 2: Set persona
  console.log('Test 2: Setting persona...');
  const persona = `You are an AI assistant helping with the "remote-claude" project.

Directory: ${projectDir}

Your role is to assist with development tasks, answer questions, and help maintain this codebase.

Please respond with "Ready." to confirm you've loaded this context.`;

  agent.setPersona(persona);
  console.log('✅ Persona set\n');

  // Test 3: Send simple message
  console.log('Test 3: Sending simple message...');
  try {
    const response1 = await agent.sendMessage('Say "test 1 passed" and nothing else.');
    console.log(`✅ Response: ${response1}\n`);
  } catch (error) {
    console.error(`❌ Test 3 failed:`, error.message);
    process.exit(1);
  }

  // Test 4: Send message with persona context
  console.log('Test 4: Sending message with persona...');
  try {
    const response2 = await agent.sendMessage('What project are you helping with? Answer in one sentence.');
    console.log(`✅ Response: ${response2}\n`);
  } catch (error) {
    console.error(`❌ Test 4 failed:`, error.message);
    process.exit(1);
  }

  // Test 5: Send message that uses tools
  console.log('Test 5: Sending message that uses Bash tool...');
  try {
    const response3 = await agent.sendMessage('Run "echo hello from test" and show me the output.');
    console.log(`✅ Response: ${response3}\n`);
  } catch (error) {
    console.error(`❌ Test 5 failed:`, error.message);
    process.exit(1);
  }

  console.log('================================================');
  console.log('✅ ALL TESTS PASSED!');
  console.log('================================================\n');

  console.log('The agent is working correctly and ready for Telegram integration.');
  process.exit(0);
}

runTests().catch(error => {
  console.error('\n❌ FATAL ERROR:', error);
  process.exit(1);
});
