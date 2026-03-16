# Remote Claude - Context Summary

## What This Is

A Telegram bot that lets you interact with Claude Code CLI from Telegram. You send messages via Telegram, they get sent to a persistent Claude Code process, and responses come back to Telegram.

## Core Flow

```
User (Telegram) → Bot → Persistent Claude Process (stdin) → stdout → Bot → User (Telegram)
```

## Architecture

### 1. Persistent Agent (`claude-telegram/agent-persistent.js`)
- Spawns a long-running `claude` CLI process
- Communicates via stdin/stdout (NOT spawning new processes per message)
- Loads persona ONCE at startup, not per message
- Uses idle timer to detect when Claude finishes responding

### 2. Bot (`claude-telegram/bot.js`)
- Telegram bot using node-telegram-bot-api
- Manages multiple projects (each with own Claude process)
- Routes messages to correct project's agent
- Logs all messages to `.claude-history.jsonl`

### 3. UI (`claude-telegram-ui/`)
- Web UI at http://localhost:3000
- Shows project list and conversation history
- Read-only view of history

## Key Files

- `claude-telegram/bot.js` - Main bot logic
- `claude-telegram/agent-persistent.js` - Persistent Claude process manager
- `claude-telegram/history.js` - JSONL history logger
- `claude-telegram/projects.json` - Project configurations
- `claude-telegram/.env` - Bot token and config
- `ecosystem.config.js` - PM2 config for both bot and UI

## Configuration

`.env` file contains:
- `ALLOWED_IDS` - Comma-separated Telegram user IDs
- `EXEC_TIMEOUT_MS` - How long to wait for Claude (default: 120000)
- `RESPONSE_IDLE_MS` - How long of silence before considering response done (default: 3000)
- `CLAUDE_TOOLS` - Comma-separated Claude tools to enable

`projects.json` contains:
```json
{
  "projects": [
    {
      "id": "unique-id",
      "name": "Project Name",
      "dir": "/absolute/path/to/project",
      "botToken": "telegram-bot-token"
    }
  ]
}
```

## How It Works

1. **Startup**: Bot spawns persistent Claude processes for each project
2. **Message Received**: Telegram message → `handlePrompt()` in bot.js
3. **Send to Claude**: Message written to `process.stdin` via `agent.sendMessage()`
4. **Wait for Response**: Idle timer detects when output stops
5. **Send to Telegram**: Response sent back via `bot.sendMessage()`
6. **Logging**: Both user message and assistant response logged to `.claude-history.jsonl`

## Current State

### What's Working
- ✅ PM2 running both bot and UI
- ✅ Persistent Claude processes spawned
- ✅ Bot connects to Telegram
- ✅ UI accessible at localhost:3000
- ✅ History logging implemented

### What's NOT Working
- ❌ Messages sent via Telegram don't get responses
- ❌ Core message flow is broken

## Running the System

```bash
# Start both bot and UI
make start

# View logs
make logs

# Check status
make status

# Restart
make restart

# Stop
make stop
```

## Debugging

1. **Check bot logs**: `tail -f claude-telegram/logs/bot-out.log`
2. **Check for Claude processes**: `ps aux | grep claude`
3. **Check history file**: `cat /path/to/project/.claude-history.jsonl`
4. **Check PM2 status**: `pm2 status`

## Problem to Fix

The core message flow (Telegram → Claude → Telegram) is not working. Need to:
1. Test if messages reach the bot
2. Test if bot sends to Claude process
3. Test if Claude process responds
4. Test if responses get back to Telegram
