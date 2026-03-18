const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const path = require('path');
const config = require('./config');
const AgentManager = require('./agent-sdk'); // Use Claude Agent SDK
const { injectPersona, getPersona, updatePersonaInConfig, updateProcessIdInConfig } = require('./persona');
const {
  detectSignals,
  readTasksFile,
  ensureTasksFile,
  getTaskCounts,
  formatHumanActionAlert,
  formatAwaitingHumanMessage
} = require('./tasks');
const AutonomousLoop = require('./loop');
const PlanningSession = require('./planner');
const HistoryLogger = require('./history');

// Store bot instances and their associated project info
const bots = [];
const processStartTime = Date.now();

/**
 * Handle /help command
 */
async function handleHelpCommand(botInfo, chatId) {
  const { bot, project } = botInfo;

  const helpMessage =
    `📚 *Claude Code Telegram Bridge*\n\n` +
    `This bot executes Claude Code commands in your project using a persistent agent.\n\n` +
    `*🔧 Connected Project*\n` +
    `Name: *${project.name}*\n` +
    `Directory: \`${project.dir}\`\n\n` +
    `*📝 Basic Commands*\n` +
    `/start - Show welcome message\n` +
    `/help - Show this help message\n` +
    `/status - Show bot status and uptime\n\n` +
    `*🎭 Persona Commands*\n` +
    `/persona - Show current persona\n` +
    `/update-persona <text> - Update persona and reload agent\n` +
    `/reset - Clear context and reload persona\n\n` +
    `*📋 Task Management*\n` +
    `/tasks - Show current TASKS.md contents\n` +
    `/done <task> - Mark a human task as complete\n\n` +
    `*🤖 Autonomous Mode*\n` +
    `/run <goal> - Start autonomous loop with a goal\n` +
    `/approve - Approve pending commit\n` +
    `/reject - Reject pending commit\n` +
    `/stop - Stop autonomous loop\n\n` +
    `*📐 Planning Mode*\n` +
    `/plan <topic> - Start interactive planning session\n` +
    `/plan-confirm - Confirm and save proposed TASKS.md\n\n` +
    `*💡 Usage Examples*\n\n` +
    `Just send any message to execute it as a Claude prompt:\n\n` +
    `• \`Fix the bug in auth.ts\`\n` +
    `• \`Add error handling to the login function\`\n` +
    `• \`Create a new API endpoint for user profile\`\n` +
    `• \`Run the tests and show me the results\`\n\n` +
    `*⚙️ Configuration*\n` +
    `• Timeout: ${config.execTimeout / 1000}s\n` +
    `• Response idle: ${config.responseIdleMs / 1000}s\n` +
    `• Allowed tools: ${config.claudeTools}`;

  await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
}

/**
 * Handle /status command
 */
async function handleStatusCommand(botInfo, chatId) {
  const { bot, project, agent, loop, planner, lastTaskTime, startTime } = botInfo;

  // Calculate uptime
  const uptime = Date.now() - processStartTime;
  const botUptime = Date.now() - startTime;
  const uptimeStr = formatDuration(uptime);
  const botUptimeStr = formatDuration(botUptime);

  // Format last task time
  let lastTaskStr = 'Never';
  if (lastTaskTime) {
    const timeSince = Date.now() - lastTaskTime;
    lastTaskStr = `${formatDuration(timeSince)} ago`;
  }

  // Get agent status
  const agentStatus = agent.ready() ? '✅ Ready' : '⏳ Initializing';
  const agentAlive = agent.isAlive() ? 'Yes' : 'No';

  // Get loop status
  const loopActive = loop.isActive() ? 'Yes' : 'No';
  const loopGoal = loop.getGoal() || 'None';
  const loopStep = loop.getStepCount();
  const pendingCommit = loop.hasPendingCommit() ? 'Yes' : 'No';

  // Get planning status
  const planningActive = planner.isActive() ? 'Yes' : 'No';
  const planningTopic = planner.getTopic() || 'None';
  const planningQuestions = planner.getQuestionCount();
  const pendingPlan = planner.hasPendingPlan() ? 'Yes' : 'No';

  // Get task counts
  ensureTasksFile(project.dir, project.name);
  const taskCounts = getTaskCounts(project.dir);

  const statusMessage =
    `📊 *Bot Status*\n\n` +
    `*Project:* ${project.name}\n` +
    `*Directory:* \`${project.dir}\`\n\n` +
    `*Agent:* ${agentStatus}\n` +
    `*Process Alive:* ${agentAlive}\n` +
    `*Process Uptime:* ${uptimeStr}\n` +
    `*Bot Uptime:* ${botUptimeStr}\n` +
    `*Last Task:* ${lastTaskStr}\n\n` +
    `*Autonomous Loop:*\n` +
    `- Active: ${loopActive}\n` +
    `- Goal: ${loopGoal.substring(0, 50)}${loopGoal.length > 50 ? '...' : ''}\n` +
    `- Step: ${loopStep}\n` +
    `- Pending Commit: ${pendingCommit}\n\n` +
    `*Planning Session:*\n` +
    `- Active: ${planningActive}\n` +
    `- Topic: ${planningTopic.substring(0, 50)}${planningTopic.length > 50 ? '...' : ''}\n` +
    `- Questions: ${planningQuestions}\n` +
    `- Pending Plan: ${pendingPlan}\n\n` +
    `*Tasks (TASKS.md):*\n` +
    `- Pending: ${taskCounts.pending}\n` +
    `- In Progress: ${taskCounts.inProgress}\n` +
    `- Completed: ${taskCounts.completed}\n` +
    `- Need Human: ${taskCounts.humanAction}\n\n` +
    `*Configuration:*\n` +
    `- Timeout: ${config.execTimeout / 1000}s\n` +
    `- Response idle: ${config.responseIdleMs / 1000}s\n` +
    `- Tools: ${config.claudeTools}\n` +
    `- Authorized users: ${config.allowedIds.length}`;

  await bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
}

/**
 * Format duration in milliseconds to human-readable string
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Initialize agent for a bot
 */
async function initializeAgent(botInfo) {
  const { bot, project, agent } = botInfo;

  try {
    // Get persona for this project
    const persona = getPersona(project);

    console.log(`   - Spawning persistent Claude process with persona...`);
    console.log(`   - Persona size: ${persona ? persona.length : 0} chars`);

    // Check if project has existing process ID
    const existingPid = project.processId;
    if (existingPid) {
      console.log(`   - Found existing process ID: ${existingPid}`);
      console.log(`   - Attempting to reconnect...`);
    }

    // Spawn with persona as initial prompt and optional PID for reconnection
    await agent.spawn(persona, existingPid);
    console.log(`   ✓ Agent spawned with persona for project: ${project.name}`);

    // Mark agent as ready
    agent.markReady();
    console.log(`   ✓ Agent ready for project: ${project.name}`);

    // Setup agent event handlers
    agent.on('reconnected', ({ processId }) => {
      console.log(`   ✓ Reconnected to existing process ${processId} for project: ${project.name}`);

      // Update process ID in projects.json
      try {
        const projectsPath = path.join(__dirname, 'projects.json');
        updateProcessIdInConfig(projectsPath, project.name, processId);
      } catch (error) {
        console.error(`   ⚠️  Failed to save process ID:`, error.message);
      }
    });

    agent.on('crash', ({ crashCount, timestamp }) => {
      console.error(`   ⚠️  Agent crashed for project ${project.name} (crash #${crashCount})`);

      // Clear process ID from projects.json on crash
      try {
        const projectsPath = path.join(__dirname, 'projects.json');
        updateProcessIdInConfig(projectsPath, project.name, null);
      } catch (error) {
        console.error(`   ⚠️  Failed to clear process ID:`, error.message);
      }
    });

    agent.on('restart', async ({ crashCount, timestamp }) => {
      console.log(`   ✓ Agent restarted for project ${project.name} (after crash #${crashCount})`);

      // Respawn with persona after restart
      try {
        console.log(`   - Respawning with persona after crash...`);
        const persona = getPersona(project);
        await agent.spawn(persona);
        agent.markReady();
        console.log(`   ✓ Agent respawned with persona after restart`);
      } catch (error) {
        console.error(`   ❌ Failed to respawn agent:`, error.message);
      }
    });

    agent.on('restart_failed', ({ error }) => {
      console.error(`   ❌ Agent restart failed for project ${project.name}:`, error.message);
    });

    // Setup loop event handlers
    setupLoopHandlers(botInfo);

    // Setup planner event handlers
    setupPlannerHandlers(botInfo);

  } catch (error) {
    console.error(`   ✗ Failed to initialize agent for project '${project.name}':`, error.message);
  }
}

/**
 * Setup planning session event handlers
 */
function setupPlannerHandlers(botInfo) {
  const { bot, project, planner } = botInfo;

  let notificationChatId = null;

  planner.on('start', ({ topic }) => {
    console.log(`[${project.name}] Planning session started for: ${topic}`);
  });

  planner.on('question_choice', async ({ questionCount, question, options, rawResponse }) => {
    console.log(`[${project.name}] Multiple choice question ${questionCount}: ${question}`);

    if (notificationChatId) {
      // Format options as numbered list
      const optionsList = options.map((opt, idx) => `${idx + 1}. ${opt}`).join('\n');

      const message =
        `❓ *[${project.name}] Question ${questionCount}*\n\n` +
        `${question}\n\n` +
        `${optionsList}\n\n` +
        `Reply with the number or text of your choice.`;

      await bot.sendMessage(notificationChatId, message, { parse_mode: 'Markdown' }).catch(() => {});
    }
  });

  planner.on('question_text', async ({ questionCount, question, rawResponse }) => {
    console.log(`[${project.name}] Text question ${questionCount}: ${question}`);

    if (notificationChatId) {
      const message =
        `❓ *[${project.name}] Question ${questionCount}*\n\n` +
        `${question}\n\n` +
        `Please provide your answer.`;

      await bot.sendMessage(notificationChatId, message, { parse_mode: 'Markdown' }).catch(() => {});
    }
  });

  planner.on('plan_complete', async ({ questionCount, plan }) => {
    console.log(`[${project.name}] Plan complete after ${questionCount} questions`);

    if (notificationChatId) {
      const message =
        `📋 *[${project.name}] Plan Complete!*\n\n` +
        `Generated after ${questionCount} questions.\n\n` +
        `Here's the proposed TASKS.md:\n\n` +
        `\`\`\`markdown\n${plan.substring(0, 2000)}\n\`\`\`\n\n` +
        `Reply /plan-confirm to save it, or send feedback for revision.`;

      await bot.sendMessage(notificationChatId, message, { parse_mode: 'Markdown' }).catch(() => {});
    }
  });

  planner.on('confirmed', async ({ plan }) => {
    console.log(`[${project.name}] Plan confirmed`);
  });

  planner.on('cancel', async () => {
    console.log(`[${project.name}] Planning session cancelled`);

    if (notificationChatId) {
      await bot.sendMessage(notificationChatId, `⏹️ *[${project.name}] Planning session cancelled*`, { parse_mode: 'Markdown' }).catch(() => {});
    }
  });

  planner.on('error', async ({ error }) => {
    console.error(`[${project.name}] Planning error:`, error.message);

    if (notificationChatId) {
      await bot.sendMessage(notificationChatId, `❌ *[${project.name}] Planning error:* ${error.message}`, { parse_mode: 'Markdown' }).catch(() => {});
    }
  });

  // Store helper to set notification chat ID
  planner.setNotificationChatId = (chatId) => {
    notificationChatId = chatId;
  };
}

/**
 * Setup autonomous loop event handlers
 */
function setupLoopHandlers(botInfo) {
  const { bot, project, loop } = botInfo;

  // Find chat ID for notifications (first authorized user)
  // Note: This is a simplified approach. In production, track per-user chat IDs
  let notificationChatId = null;

  loop.on('start', ({ goal }) => {
    console.log(`[${project.name}] Loop started with goal: ${goal}`);
  });

  loop.on('step', async ({ stepCount, response }) => {
    console.log(`[${project.name}] Loop step ${stepCount}`);

    if (notificationChatId) {
      const message = `🔄 *[${project.name}] Step ${stepCount}*\n\n${response.substring(0, 300)}...`;
      await bot.sendMessage(notificationChatId, message, { parse_mode: 'Markdown' }).catch(() => {});
    }
  });

  loop.on('commit_ready', async ({ stepCount, response }) => {
    console.log(`[${project.name}] Commit ready at step ${stepCount}`);

    if (notificationChatId) {
      const message =
        `📝 *[${project.name}] Ready to commit:*\n\n` +
        `${response.substring(0, 500)}\n\n` +
        `Reply /approve to commit or /reject to skip.`;
      await bot.sendMessage(notificationChatId, message, { parse_mode: 'Markdown' }).catch(() => {});
    }
  });

  loop.on('complete', async ({ stepCount, response }) => {
    console.log(`[${project.name}] Loop completed after ${stepCount} steps`);

    if (notificationChatId) {
      const message =
        `✅ *[${project.name}] Goal Complete!*\n\n` +
        `Completed in ${stepCount} steps.\n\n` +
        `${response.substring(0, 500)}`;
      await bot.sendMessage(notificationChatId, message, { parse_mode: 'Markdown' }).catch(() => {});
    }
  });

  loop.on('stop', async ({ summary }) => {
    console.log(`[${project.name}] Loop stopped`);

    if (notificationChatId) {
      const message =
        `⏹️ *[${project.name}] Loop Stopped*\n\n` +
        `${summary.substring(0, 500)}`;
      await bot.sendMessage(notificationChatId, message, { parse_mode: 'Markdown' }).catch(() => {});
    }
  });

  loop.on('error', async ({ error }) => {
    console.error(`[${project.name}] Loop error:`, error.message);

    if (notificationChatId) {
      await bot.sendMessage(notificationChatId, `❌ *[${project.name}] Loop error:* ${error.message}`, { parse_mode: 'Markdown' }).catch(() => {});
    }
  });

  // Store helper to set notification chat ID
  loop.setNotificationChatId = (chatId) => {
    notificationChatId = chatId;
  };
}

/**
 * Initialize all bots from projects configuration
 */
function initializeBots() {
  console.log('🚀 Starting Claude-Telegram Bridge...\n');
  console.log(`📋 Configuration:`);
  console.log(`   - Allowed IDs: ${config.allowedIds.join(', ')}`);
  console.log(`   - Execution timeout: ${config.execTimeout}ms`);
  console.log(`   - Claude tools: ${config.claudeTools}`);
  console.log(`   - Projects to initialize: ${config.projects.length}\n`);

  // Create a bot instance for each project
  config.projects.forEach((project, index) => {
    try {
      console.log(`[${index + 1}/${config.projects.length}] Initializing bot for project: ${project.name}`);
      console.log(`   - Directory: ${project.dir}`);

      // Create bot instance
      const bot = new TelegramBot(project.token, { polling: true });

      // Create agent for persistent Claude process
      const agent = new AgentManager(project.dir, {
        responseIdleMs: config.responseIdleMs || 3000
      });

      // Create autonomous loop manager
      const loop = new AutonomousLoop(agent);

      // Create planning session manager
      const planner = new PlanningSession(agent);

      // Create history logger
      const history = new HistoryLogger(project.dir, project.name);

      // Store bot info
      const botInfo = {
        bot: bot,
        project: project,
        agent: agent,
        loop: loop,
        planner: planner,
        history: history,
        lastTaskTime: null,
        startTime: Date.now(),
        chatSessions: new Map() // Track session per chat ID
      };

      bots.push(botInfo);

      // Setup message handlers for this bot
      setupMessageHandlers(botInfo);

      // Initialize agent (spawn process)
      initializeAgent(botInfo);

      // Test bot token by getting bot info
      bot.getMe()
        .then(me => {
          console.log(`   ✓ Bot connected: @${me.username} (${me.first_name})`);
          console.log(`   ✓ Bound to project: ${project.name}\n`);
        })
        .catch(error => {
          console.error(`   ✗ Failed to connect bot for project '${project.name}':`, error.message);
          console.error(`   ✗ Please check if the token is valid\n`);
        });

    } catch (error) {
      console.error(`   ✗ Error initializing bot for project '${project.name}':`, error.message);
      console.error(`   ✗ Skipping this project\n`);
    }
  });

  if (bots.length === 0) {
    console.error('❌ No bots were successfully initialized. Exiting...');
    process.exit(1);
  }

  console.log(`✅ Initialized ${bots.length} bot(s) successfully`);
  console.log('🎯 Ready to receive messages!\n');
}

/**
 * Setup message handlers for a bot
 */
function setupMessageHandlers(botInfo) {
  const { bot, project } = botInfo;

  // Handle all text messages
  bot.on('message', async (msg) => {
    // Only process text messages
    if (!msg.text) {
      return;
    }

    // Authentication check
    if (!isAuthorized(msg.from.id)) {
      console.log(`🚫 Unauthorized access attempt from user ${msg.from.id} (${msg.from.username || 'no username'})`);
      return; // Silently drop unauthorized messages
    }

    const chatId = msg.chat.id;
    const messageText = msg.text;

    console.log(`📨 [${project.name}] Message from @${msg.from.username || msg.from.id}: ${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}`);

    // Handle commands
    if (messageText.startsWith('/')) {
      await handleCommand(botInfo, msg);
    } else {
      // Handle regular prompt
      await handlePrompt(botInfo, msg);
    }
  });

  // Handle polling errors
  bot.on('polling_error', (error) => {
    console.error(`⚠️  [${project.name}] Polling error:`, error.message);
  });

  // Handle errors
  bot.on('error', (error) => {
    console.error(`❌ [${project.name}] Bot error:`, error.message);
  });
}

/**
 * Check if a user is authorized
 */
function isAuthorized(userId) {
  return config.allowedIds.includes(userId);
}

/**
 * Execute Claude prompt via persistent agent
 */
async function handlePrompt(botInfo, msg) {
  const { bot, project, agent, planner, history, chatSessions } = botInfo;
  const chatId = msg.chat.id;
  const prompt = msg.text;

  // Update last task time
  botInfo.lastTaskTime = Date.now();

  // Log user message to history
  await history.logUser(prompt, { chatId, userId: msg.from.id });

  try {
    // If planning session is active, route message as answer
    if (planner && planner.isActive()) {
      // Check if there's a pending plan (user is giving feedback)
      if (planner.hasPendingPlan()) {
        await bot.sendMessage(chatId, '🔄 Submitting feedback for plan revision...');
        await planner.submitFeedback(prompt);
      } else {
        // Regular answer to planning question
        await bot.sendMessage(chatId, '📝 Submitting answer...');
        await planner.submitAnswer(prompt);
      }
      return;
    }

    // Check if agent is ready
    if (!agent.ready()) {
      await bot.sendMessage(chatId, '⏳ Agent is initializing, please wait...');
      return;
    }

    // Send working indicator
    const workingMsg = await bot.sendMessage(chatId, '⏳ Working...');

    // Send typing action
    await bot.sendChatAction(chatId, 'typing');

    console.log(`🔧 [${project.name}] Sending prompt to agent (${prompt.length} chars)`);

    // Get session ID for this chat (if exists)
    const chatSessionId = chatSessions.get(chatId);

    // Send message to agent with session ID
    const result = await agent.sendMessage(prompt, chatSessionId);

    // Store session ID for this chat
    if (result.sessionId) {
      chatSessions.set(chatId, result.sessionId);
    }

    const response = result.response;

    console.log(`✅ [${project.name}] Got response from agent (${response.length} chars)`);

    // Log assistant response to history
    await history.logAssistant(response, { responseLength: response.length, sessionId: result.sessionId });

    // Check for task-related signals in the response
    const signals = detectSignals(response);

    // Handle human action required signal
    if (signals.humanActionRequired) {
      const alert = formatHumanActionAlert(project.name, signals.humanActionRequired);
      await bot.sendMessage(chatId, alert, { parse_mode: 'Markdown' });
    }

    // Handle awaiting human signal
    if (signals.awaitingHuman) {
      const message = formatAwaitingHumanMessage(project.name);
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    // Delete working message
    await bot.deleteMessage(chatId, workingMsg.message_id).catch(() => {});

    // Send response to user (with chunking)
    const output = response.trim() || '✅ Command executed successfully (no output)';
    await sendResponse(bot, chatId, output);

  } catch (error) {
    console.error(`❌ [${project.name}] Error handling prompt:`, error.message);

    // Log error to history
    await history.logAssistant(`ERROR: ${error.message}`, { error: true, errorType: error.name });

    await bot.sendMessage(chatId, `❌ Error: ${error.message}`).catch(() => {});
  }
}

/**
 * Send response to user (handles chunking for long messages)
 */
async function sendResponse(bot, chatId, text) {
  const MAX_MESSAGE_LENGTH = 4000;

  // If message is short enough, send it directly
  if (text.length <= MAX_MESSAGE_LENGTH) {
    await bot.sendMessage(chatId, text);
    return;
  }

  // Split long messages (basic implementation, will be improved in TASK-07)
  const chunks = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= MAX_MESSAGE_LENGTH) {
      chunks.push(remaining);
      break;
    }

    // Find a good breaking point (newline, space, etc.)
    let breakPoint = MAX_MESSAGE_LENGTH;
    const lastNewline = remaining.lastIndexOf('\n', MAX_MESSAGE_LENGTH);
    const lastSpace = remaining.lastIndexOf(' ', MAX_MESSAGE_LENGTH);

    if (lastNewline > MAX_MESSAGE_LENGTH * 0.8) {
      breakPoint = lastNewline;
    } else if (lastSpace > MAX_MESSAGE_LENGTH * 0.8) {
      breakPoint = lastSpace;
    }

    chunks.push(remaining.substring(0, breakPoint));
    remaining = remaining.substring(breakPoint).trim();
  }

  // Send chunks
  for (let i = 0; i < chunks.length; i++) {
    const prefix = chunks.length > 1 ? `📄 Message ${i + 1}/${chunks.length}\n\n` : '';
    await bot.sendMessage(chatId, prefix + chunks[i]);

    // Small delay between chunks
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

/**
 * Handle /reset command - clear session for this chat
 */
async function handleResetCommand(botInfo, chatId) {
  const { bot, project, chatSessions } = botInfo;

  try {
    // Clear session for this chat
    chatSessions.delete(chatId);

    console.log(`[${project.name}] Session reset for chat ${chatId}`);
    await bot.sendMessage(chatId, '🔄 Session cleared. Your next message will start a new conversation!');

  } catch (error) {
    console.error(`[${project.name}] Reset failed:`, error.message);
    await bot.sendMessage(chatId, `❌ Reset failed: ${error.message}`);
  }
}

/**
 * Handle /persona command - display current persona
 */
async function handlePersonaCommand(botInfo, chatId) {
  const { bot, project } = botInfo;

  const persona = getPersona(project);

  const message =
    `🎭 *Current Persona for ${project.name}*\n\n` +
    `\`\`\`\n${persona}\n\`\`\``;

  await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

/**
 * Handle /update-persona command - update persona in config and reset
 */
async function handleUpdatePersonaCommand(botInfo, chatId, messageText) {
  const { bot, project, agent } = botInfo;

  // Extract new persona from command
  const parts = messageText.split(' ');
  if (parts.length < 2) {
    await bot.sendMessage(
      chatId,
      '❌ Usage: /update-persona <new persona text>\n\nExample:\n' +
      '/update-persona You are a helpful assistant...'
    );
    return;
  }

  const newPersona = messageText.substring(messageText.indexOf(' ') + 1).trim();

  if (!newPersona) {
    await bot.sendMessage(chatId, '❌ Persona cannot be empty');
    return;
  }

  try {
    await bot.sendMessage(chatId, '💾 Updating persona...');

    // Update persona in projects.json
    const projectsPath = path.join(__dirname, 'projects.json');
    updatePersonaInConfig(projectsPath, project.name, newPersona);

    // Update project object in memory
    project.persona = newPersona;

    // Trigger reset to load new persona
    await bot.sendMessage(chatId, '🔄 Reloading agent with new persona...');

    await agent.kill();
    await agent.spawn(newPersona);
    agent.markReady();

    await bot.sendMessage(chatId, '✅ Persona updated and agent reloaded!');

  } catch (error) {
    console.error(`[${project.name}] Update persona failed:`, error.message);
    await bot.sendMessage(chatId, `❌ Update failed: ${error.message}`);
  }
}

/**
 * Handle /tasks command - display current TASKS.md contents
 */
async function handleTasksCommand(botInfo, chatId) {
  const { bot, project } = botInfo;

  // Ensure TASKS.md exists
  ensureTasksFile(project.dir, project.name);

  // Read TASKS.md
  const content = readTasksFile(project.dir);

  if (!content) {
    await bot.sendMessage(chatId, '❌ TASKS.md not found for this project.');
    return;
  }

  // Get task counts for summary
  const counts = getTaskCounts(project.dir);
  const summary =
    `📋 *TASKS.md for ${project.name}*\n\n` +
    `📊 Summary: ${counts.pending} pending, ${counts.inProgress} in progress, ` +
    `${counts.completed} completed, ${counts.humanAction} need human action\n\n` +
    `---\n\n`;

  // Send content with chunking
  await sendResponse(bot, chatId, summary + content);
}

/**
 * Handle /done command - mark a human task as complete
 */
async function handleDoneCommand(botInfo, chatId, messageText) {
  const { bot, project, agent } = botInfo;

  // Extract task description
  const parts = messageText.split(' ');
  if (parts.length < 2) {
    await bot.sendMessage(
      chatId,
      '❌ Usage: /done <task description>\n\nExample:\n/done SSL certificate setup'
    );
    return;
  }

  const taskDescription = messageText.substring(messageText.indexOf(' ') + 1).trim();

  try {
    // Check if agent is ready
    if (!agent.ready()) {
      await bot.sendMessage(chatId, '⏳ Agent is not ready yet.');
      return;
    }

    await bot.sendMessage(chatId, `✅ Marking task complete: "${taskDescription}"`);

    // Send message to agent to mark task complete
    const instruction =
      `The human task "${taskDescription}" is complete. ` +
      `Check TASKS.md for anything that was unblocked and continue working on available tasks.`;

    const result = await agent.sendMessage(instruction);
    const response = result.response;

    // Check for signals
    const signals = detectSignals(response);

    if (signals.humanActionRequired) {
      const alert = formatHumanActionAlert(project.name, signals.humanActionRequired);
      await bot.sendMessage(chatId, alert, { parse_mode: 'Markdown' });
    }

    if (signals.awaitingHuman) {
      const message = formatAwaitingHumanMessage(project.name);
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    // Send agent response
    await sendResponse(bot, chatId, response);

  } catch (error) {
    console.error(`[${project.name}] /done command failed:`, error.message);
    await bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
}

/**
 * Handle /run command - start autonomous loop
 */
async function handleRunCommand(botInfo, chatId, messageText) {
  const { bot, project, agent, loop } = botInfo;

  // Extract goal
  const parts = messageText.split(' ');
  if (parts.length < 2) {
    await bot.sendMessage(
      chatId,
      '❌ Usage: /run <goal>\n\nExample:\n/run Refactor the payment module to use Stripe v3'
    );
    return;
  }

  const goal = messageText.substring(messageText.indexOf(' ') + 1).trim();

  try {
    // Check if loop is already active
    if (loop.isActive()) {
      await bot.sendMessage(chatId, '⚠️ Autonomous loop is already running. Use /stop to stop it first.');
      return;
    }

    // Check if agent is ready
    if (!agent.ready()) {
      await bot.sendMessage(chatId, '⏳ Agent is not ready yet.');
      return;
    }

    // Set notification chat ID for this loop
    loop.setNotificationChatId(chatId);

    await bot.sendMessage(chatId, `🚀 Starting autonomous loop...\n\n*Goal:* ${goal}`, { parse_mode: 'Markdown' });

    // Start the loop
    await loop.start(goal);

  } catch (error) {
    console.error(`[${project.name}] /run command failed:`, error.message);
    await bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
}

/**
 * Handle /approve command - approve pending commit
 */
async function handleApproveCommand(botInfo, chatId) {
  const { bot, project, loop } = botInfo;

  try {
    if (!loop.hasPendingCommit()) {
      await bot.sendMessage(chatId, '⚠️ No pending commit to approve.');
      return;
    }

    await bot.sendMessage(chatId, '✅ Commit approved. Proceeding...');
    await loop.approveCommit();

  } catch (error) {
    console.error(`[${project.name}] /approve command failed:`, error.message);
    await bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
}

/**
 * Handle /reject command - reject pending commit
 */
async function handleRejectCommand(botInfo, chatId) {
  const { bot, project, loop } = botInfo;

  try {
    if (!loop.hasPendingCommit()) {
      await bot.sendMessage(chatId, '⚠️ No pending commit to reject.');
      return;
    }

    await bot.sendMessage(chatId, '🚫 Commit rejected. Skipping...');
    await loop.rejectCommit();

  } catch (error) {
    console.error(`[${project.name}] /reject command failed:`, error.message);
    await bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
}

/**
 * Handle /stop command - stop autonomous loop
 */
async function handleStopCommand(botInfo, chatId) {
  const { bot, project, loop } = botInfo;

  try {
    if (!loop.isActive()) {
      await bot.sendMessage(chatId, '⚠️ No autonomous loop is running.');
      return;
    }

    await bot.sendMessage(chatId, '⏹️ Stopping autonomous loop...');
    await loop.stop();

  } catch (error) {
    console.error(`[${project.name}] /stop command failed:`, error.message);
    await bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
}

/**
 * Handle /plan command - start planning session
 */
async function handlePlanCommand(botInfo, chatId, messageText) {
  const { bot, project, agent, planner } = botInfo;

  // Extract topic
  const parts = messageText.split(' ');
  if (parts.length < 2) {
    await bot.sendMessage(
      chatId,
      '❌ Usage: /plan <topic>\n\nExample:\n/plan redesign the auth flow'
    );
    return;
  }

  const topic = messageText.substring(messageText.indexOf(' ') + 1).trim();

  try {
    // Check if planning session is already active
    if (planner.isActive()) {
      await bot.sendMessage(chatId, '⚠️ Planning session already in progress. Send answers or use /plan-confirm.');
      return;
    }

    // Check if agent is ready
    if (!agent.ready()) {
      await bot.sendMessage(chatId, '⏳ Agent is not ready yet.');
      return;
    }

    // Set notification chat ID
    planner.setNotificationChatId(chatId);

    await bot.sendMessage(chatId, `📋 Starting planning session...\n\n*Topic:* ${topic}`, { parse_mode: 'Markdown' });

    // Start planning session
    await planner.start(topic);

  } catch (error) {
    console.error(`[${project.name}] /plan command failed:`, error.message);
    await bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
}

/**
 * Handle /plan-confirm command - confirm and save proposed plan
 */
async function handlePlanConfirmCommand(botInfo, chatId) {
  const { bot, project, planner } = botInfo;
  const fs = require('fs');
  const path = require('path');

  try {
    if (!planner.hasPendingPlan()) {
      await bot.sendMessage(chatId, '⚠️ No pending plan to confirm.');
      return;
    }

    // Get the plan
    const plan = planner.confirmPlan();

    // Write to TASKS.md
    const tasksPath = path.join(project.dir, 'TASKS.md');
    fs.writeFileSync(tasksPath, plan, 'utf8');

    console.log(`[${project.name}] Saved plan to ${tasksPath}`);

    await bot.sendMessage(
      chatId,
      `✅ *Plan confirmed and saved!*\n\n` +
      `TASKS.md has been created in your project directory.\n\n` +
      `Use /tasks to view it or /run <goal> to start working on it.`,
      { parse_mode: 'Markdown' }
    );

  } catch (error) {
    console.error(`[${project.name}] /plan-confirm failed:`, error.message);
    await bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
}

/**
 * Handle bot commands
 */
async function handleCommand(botInfo, msg) {
  const { bot, project } = botInfo;
  const chatId = msg.chat.id;
  const messageText = msg.text;
  const command = messageText.split(' ')[0].toLowerCase();

  switch (command) {
    case '/start':
      await bot.sendMessage(
        chatId,
        `👋 Welcome to Claude Code Bridge!\n\n` +
        `This bot is connected to project: *${project.name}*\n` +
        `Directory: \`${project.dir}\`\n\n` +
        `Send me any message and I'll execute it as a Claude Code prompt in this project.\n\n` +
        `Use /help to see available commands.`,
        { parse_mode: 'Markdown' }
      );
      break;

    case '/help':
      await handleHelpCommand(botInfo, chatId);
      break;

    case '/status':
      await handleStatusCommand(botInfo, chatId);
      break;

    case '/reset':
      await handleResetCommand(botInfo, chatId);
      break;

    case '/persona':
      await handlePersonaCommand(botInfo, chatId);
      break;

    case '/update-persona':
      await handleUpdatePersonaCommand(botInfo, chatId, messageText);
      break;

    case '/tasks':
      await handleTasksCommand(botInfo, chatId);
      break;

    case '/done':
      await handleDoneCommand(botInfo, chatId, messageText);
      break;

    case '/run':
      await handleRunCommand(botInfo, chatId, messageText);
      break;

    case '/approve':
      await handleApproveCommand(botInfo, chatId);
      break;

    case '/reject':
      await handleRejectCommand(botInfo, chatId);
      break;

    case '/stop':
      await handleStopCommand(botInfo, chatId);
      break;

    case '/plan':
      await handlePlanCommand(botInfo, chatId, messageText);
      break;

    case '/plan-confirm':
      await handlePlanConfirmCommand(botInfo, chatId);
      break;

    default:
      await bot.sendMessage(chatId, `❓ Unknown command: ${command}\n\nUse /help to see available commands.`);
  }
}

// Start the bots
initializeBots();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');

  // Stop all bots and agents
  for (const botInfo of bots) {
    botInfo.bot.stopPolling();
    if (botInfo.agent) {
      await botInfo.agent.kill();
    }
  }

  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');

  // Stop all bots and agents
  for (const botInfo of bots) {
    botInfo.bot.stopPolling();
    if (botInfo.agent) {
      await botInfo.agent.kill();
    }
  }

  process.exit(0);
});
