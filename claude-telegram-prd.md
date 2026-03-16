# Claude-Telegram Bridge — PRD

**Version:** 1.1  
**Status:** Ready for Development  
**Date:** March 2026

---

## Overview

A lightweight Node.js process that lets the developer send natural language prompts to Claude Code from any device. Each project gets its **own dedicated Telegram bot** — messaging that bot always runs Claude Code in that project's directory, with context persisted via `CLAUDE.md`. A single shared `bot.js` process handles all bots; each bot is just a separate token + project directory pair in config.

**Problem:** Need a dead-simple, self-hosted way to run Claude Code remotely without any unreliable third-party tooling.

---

## Goals

- One dedicated Telegram bot per project for zero-ambiguity routing
- All bots run from a single Node.js process (no duplication)
- Persist per-project context using `CLAUDE.md` files
- Restrict access to whitelisted Telegram user IDs only
- Survive crashes and reboots via PM2
- Handle long responses gracefully (Telegram's 4096 char limit)
- Adding a new project = add one entry to config, no code changes

## Non-Goals (v1)

- No multi-user support
- No conversation history / multi-turn context (stateless per message)
- No file upload support
- No web UI

---

## Features

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F-01 | Prompt Dispatch | Pass any text message to `claude -p` in the bot's bound project dir | Must Have |
| F-02 | Per-Bot Project Binding | Each bot token is statically bound to one project directory in config | Must Have |
| F-03 | Multi-Bot Single Process | All bots instantiated from one `bot.js` process, one entry per project | Must Have |
| F-04 | Auth Whitelist | All messages checked against `ALLOWED_IDS`; unauthorized dropped | Must Have |
| F-05 | Response Chunking | Responses >4000 chars split into sequential Telegram messages | Must Have |
| F-06 | Config File | All bots defined in `projects.json` with token + directory per entry | Must Have |
| F-07 | PM2 Setup | Single process managed by PM2 with auto-restart and reboot persistence | Must Have |
| F-08 | Execution Timeout | `claude -p` calls time out after configurable duration (default 2 min) | Should Have |
| F-09 | Typing Indicator | Bot sends typing action + "⏳ Working..." while Claude runs | Should Have |
| F-10 | Status Command | `/status` shows bound project name, uptime, last task time | Should Have |
| F-11 | Help Command | `/help` lists all commands and usage | Should Have |

---

## Commands

Each bot only knows its own project — no switching needed.

| Command | Description | Example |
|---------|-------------|---------|
| `/status` | Show bound project + uptime | `/status` |
| `/help` | Show all commands | `/help` |
| `<any text>` | Run as Claude Code prompt in this bot's project | `Fix the type error in auth.ts` |

> `/project` and `/list` commands are removed — project is determined by which bot you message.

---

## Technical Stack

- **Runtime:** Node.js 18+
- **Bot library:** `node-telegram-bot-api`
- **Claude execution:** `claude` CLI via `child_process.execSync`
- **Process manager:** PM2
- **Config:** `.env` (dotenv) + `projects.json`

---

## Directory Structure

```
claude-telegram/
  ├── bot.js                # Main process — spins up one bot instance per project
  ├── config.js             # Loads env + projects config
  ├── projects.json         # Per-project: name, token, directory
  ├── ecosystem.config.js   # PM2 config (single process entry)
  ├── .env                  # ALLOWED_IDS, EXEC_TIMEOUT_MS, shared settings
  └── README.md
```

---

## Configuration

**`.env`** — shared settings across all bots
```
ALLOWED_IDS=123456789,987654321
EXEC_TIMEOUT_MS=120000
CLAUDE_TOOLS=Bash,Read,Write
```

**`projects.json`** — one entry per project/bot
```json
[
  {
    "name": "my-api",
    "token": "111111111:AAF_bot_token_for_my_api",
    "dir": "/home/user/projects/my-api"
  },
  {
    "name": "frontend",
    "token": "222222222:AAF_bot_token_for_frontend",
    "dir": "/home/user/projects/frontend"
  },
  {
    "name": "infra",
    "token": "333333333:AAF_bot_token_for_infra",
    "dir": "/home/user/projects/infra"
  }
]
```

> Each token comes from a separate `@BotFather` bot. Create one per project.

---

## Core Flow

1. `bot.js` starts → reads `projects.json` → instantiates one `TelegramBot` per entry
2. Message arrives on any bot
3. Auth check — sender ID in `ALLOWED_IDS`? If not, drop.
4. Is it a `/command`? Route to command handler.
5. Otherwise: run `claude -p "<message>" --allowedTools "Bash,Read,Write"` in that bot's bound `dir`
6. Chunk output if >4000 chars, send all chunks back via the same bot

---

## Acceptance Criteria

- Messaging bot A always executes Claude Code in project A's directory
- Messaging bot B always executes Claude Code in project B's directory
- Adding a new project requires only a new entry in `projects.json` — no code changes
- Unauthorized IDs get no response or a standard rejection
- Responses >4000 chars are split and sent sequentially
- All bots restart automatically on crash and on system reboot (single PM2 process)
- Timed-out tasks notify the user instead of hanging
- Tokens and allowed IDs never hardcoded — always from config files

---

## Out of Scope (v1)

- Conversation history / multi-turn context
- File/image uploads
- Multiple concurrent executions
- Web dashboard or admin UI
- Multi-user access controls

## Future (v2+)

- Multi-turn conversation threading per project session
- File upload support via Telegram attachments
- Async task queue for concurrent execution
- `/cancel` to kill a running task
- Per-project tool permission overrides
- Per-project `ALLOWED_IDS` overrides
