# Claude-Telegram Bridge

A lightweight Node.js bridge that lets you control Claude Code from any device via Telegram. Each project gets its own dedicated bot for zero-ambiguity routing.

## Features

- 🤖 **One bot per project** - Each Telegram bot is bound to a specific project directory
- 🔄 **Single process** - All bots run from one Node.js process managed by PM2
- 🔐 **Whitelist auth** - Only authorized Telegram user IDs can interact
- 📝 **Project context** - Uses `CLAUDE.md` files for persistent context
- ⚡ **Simple setup** - Add new projects by editing one config file
- 🛡️ **Auto-restart** - PM2 ensures the bot survives crashes and reboots
- 📊 **Built-in commands** - `/status`, `/help` for monitoring and usage info

## Prerequisites

- **Node.js 18+** installed
- **Claude CLI** installed and accessible in PATH ([Get it here](https://claude.ai/download))
- **Telegram account** to create bots
- **PM2** (installed automatically with npm install)

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd claude-telegram
npm install
```

### 2. Create Telegram Bots

For each project you want to control, create a dedicated Telegram bot:

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the prompts
3. Copy the bot token (looks like `123456789:ABCdef...`)
4. Repeat for each project

**Get your Telegram user ID:**
- Message [@userinfobot](https://t.me/userinfobot) on Telegram
- Copy your user ID (a number like `123456789`)

### 3. Configure Environment

```bash
cp .env.example .env
nano .env  # or use your preferred editor
```

Edit `.env`:

```env
# Your Telegram user ID(s) - comma-separated for multiple users
ALLOWED_IDS=123456789,987654321

# Timeout for Claude CLI execution (milliseconds)
EXEC_TIMEOUT_MS=120000

# Tools Claude can use
CLAUDE_TOOLS=Bash,Read,Write,Edit,Glob,Grep
```

### 4. Configure Projects

```bash
cp projects.json.example projects.json
nano projects.json
```

Edit `projects.json`:

```json
[
  {
    "name": "my-api",
    "token": "123456789:ABCdef_your_bot_token_from_botfather",
    "dir": "/absolute/path/to/your/project"
  },
  {
    "name": "frontend",
    "token": "987654321:XYZabc_another_bot_token",
    "dir": "/absolute/path/to/frontend/project"
  }
]
```

**Important:**
- Use **absolute paths** for project directories
- Each `token` must be from a different bot (from BotFather)
- Each `name` must be unique

### 5. Test the Configuration

```bash
# Test if config loads correctly
node -e "const config = require('./config'); console.log('✓ Config valid:', config.projects.length, 'projects loaded')"
```

### 6. Run the Bot

**Development mode:**
```bash
npm start
```

**Production mode (with PM2):**
```bash
npm run pm2:start
```

## PM2 Management

PM2 keeps your bot running 24/7, auto-restarts on crash, and survives reboots.

### Basic Commands

```bash
# Start the bot
npm run pm2:start

# Stop the bot
npm run pm2:stop

# Restart the bot
npm run pm2:restart

# View logs
npm run pm2:logs

# View status
pm2 status

# View detailed info
pm2 show claude-telegram
```

### Enable Auto-Start on Boot

```bash
# Generate startup script
pm2 startup

# Save current process list
pm2 save
```

Follow the instructions PM2 prints. You'll need to run one command with `sudo`.

### View Logs

```bash
# Real-time logs
pm2 logs claude-telegram

# Last 100 lines
pm2 logs claude-telegram --lines 100

# Error logs only
pm2 logs claude-telegram --err

# Log files are also saved in ./logs/
tail -f logs/out.log
tail -f logs/error.log
```

## Usage

### Send Commands to Claude

1. Open Telegram and find your bot (the one you created for a specific project)
2. Send any message to execute it as a Claude prompt:

```
Fix the bug in auth.ts
```

```
Add error handling to the login function
```

```
Create a new API endpoint for user profile
```

The bot executes the command in that project's directory with full context from `CLAUDE.md`.

### Bot Commands

- `/start` - Show welcome message
- `/help` - Show available commands and usage examples
- `/status` - Show bot status, uptime, and configuration

### Example Workflow

1. **Message your "my-api" bot:**
   ```
   Add logging to the authentication middleware
   ```

2. **Message your "frontend" bot:**
   ```
   Create a loading spinner component
   ```

Each bot runs Claude in its own project directory automatically!

## Configuration Reference

### Environment Variables (.env)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ALLOWED_IDS` | Comma-separated Telegram user IDs | - | ✅ Yes |
| `EXEC_TIMEOUT_MS` | Claude execution timeout (ms) | 120000 | No |
| `CLAUDE_TOOLS` | Comma-separated list of allowed tools | Bash,Read,Write,Edit,Glob,Grep | No |

### Project Configuration (projects.json)

```json
{
  "name": "string",      // Unique project identifier
  "token": "string",     // Telegram bot token from BotFather
  "dir": "string"        // Absolute path to project directory
}
```

## Directory Structure

```
claude-telegram/
├── bot.js                 # Main process - manages all bots
├── config.js              # Configuration loader and validator
├── ecosystem.config.js    # PM2 process configuration
├── package.json           # Node.js dependencies
├── .env                   # Environment variables (gitignored)
├── projects.json          # Project configurations (gitignored)
├── .env.example           # Example environment config
├── projects.json.example  # Example project config
├── logs/                  # PM2 log files (gitignored)
│   ├── out.log
│   └── error.log
└── README.md             # This file
```

## Troubleshooting

### Bot not responding

1. Check if the process is running:
   ```bash
   pm2 status
   ```

2. Check logs for errors:
   ```bash
   pm2 logs claude-telegram
   ```

3. Verify your user ID is in `ALLOWED_IDS`:
   ```bash
   cat .env | grep ALLOWED_IDS
   ```

### "Unauthorized access attempt" in logs

Your Telegram user ID is not in the `ALLOWED_IDS` list. Get your ID from [@userinfobot](https://t.me/userinfobot) and add it to `.env`.

### Bot token errors

1. Verify the token in `projects.json` matches the one from BotFather
2. Make sure you're using the full token (e.g., `123456789:ABCdef...`)
3. Check if the token is properly quoted in the JSON file

### "projects.json not found"

Copy the example file:
```bash
cp projects.json.example projects.json
```

Then edit it with your bot tokens and project paths.

### Claude CLI not found

Make sure Claude CLI is installed and in your PATH:
```bash
which claude
claude --version
```

If not found, install it from [claude.ai/download](https://claude.ai/download).

### Directory does not exist warning

The project directory path in `projects.json` doesn't exist. Use absolute paths:
```json
{
  "dir": "/Users/username/projects/my-project"  // ✅ Correct
}
```

Not:
```json
{
  "dir": "~/projects/my-project"  // ❌ Wrong - don't use ~
  "dir": "./my-project"           // ❌ Wrong - use absolute paths
}
```

### Timeout errors

If commands timeout (default 2 minutes), increase the timeout in `.env`:
```env
EXEC_TIMEOUT_MS=300000  # 5 minutes
```

## Security Best Practices

1. **Never commit** `.env` or `projects.json` to version control
2. **Keep bot tokens secret** - they provide full access to your bots
3. **Restrict ALLOWED_IDS** - only add Telegram user IDs you trust
4. **Use project-specific bots** - don't reuse tokens across environments
5. **Review Claude's actions** - check what commands execute in your projects

## Adding a New Project

1. Create a new bot via [@BotFather](https://t.me/BotFather)
2. Copy the bot token
3. Edit `projects.json` and add a new entry:
   ```json
   {
     "name": "new-project",
     "token": "your-new-bot-token",
     "dir": "/absolute/path/to/new-project"
   }
   ```
4. Restart the bot:
   ```bash
   npm run pm2:restart
   ```

No code changes needed!

## Architecture

- **Single Process:** One `bot.js` process manages all bots
- **Multiple Bot Instances:** Each project gets a `TelegramBot` instance
- **Static Binding:** Bots are permanently bound to their project directory
- **Stateless Execution:** Each message is an independent Claude CLI call
- **Auth Layer:** All messages checked against `ALLOWED_IDS` whitelist
- **Process Management:** PM2 handles crashes, restarts, and logging

## Limitations (v1)

- No conversation history / multi-turn context
- No file upload support
- One message executes one Claude command (no queueing)
- No per-project tool permissions (uses global `CLAUDE_TOOLS`)

## Roadmap (v2+)

- [ ] Multi-turn conversation threading
- [ ] File upload support via Telegram attachments
- [ ] Async task queue for concurrent execution
- [ ] `/cancel` command to kill running tasks
- [ ] Per-project tool permission overrides
- [ ] Per-project user access controls

## License

ISC

## Support

For issues, questions, or contributions, please open an issue on GitHub.
