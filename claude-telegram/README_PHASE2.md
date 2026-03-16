# Claude-Telegram Bridge v2.0

A powerful Node.js bridge that transforms Claude Code into persistent, persona-driven autonomous agents controlled via Telegram. Each project gets its own dedicated bot with persistent context and autonomous execution capabilities.

## 🎯 What's New in Phase 2

Phase 2 transforms the basic bridge into a **full autonomous agent system**:

1. **Persistent Agents** - One long-lived Claude process per project (no more per-request spawning)
2. **Personas** - Each agent has a persistent identity and project context
3. **Task Management** - Integrated TASKS.md with human-action flagging
4. **Autonomous Mode** - Goal-driven execution with commit sign-off gates
5. **Planning Mode** - Interactive Q&A to gather requirements and generate task lists
6. **Watchdog** - Auto-recovery from crashes with persona reinjection

## Features

### Core Features
- 🤖 **One bot per project** - Each Telegram bot is bound to a specific project directory
- 🧠 **Persistent agents** - Long-lived Claude processes maintain context across messages
- 🎭 **Personas** - Each agent has a unique identity and north star for the project
- 🔄 **Single process** - All bots run from one Node.js process managed by PM2
- 🔐 **Whitelist auth** - Only authorized Telegram user IDs can interact
- 🛡️ **Auto-restart** - PM2 + watchdog ensure agents survive crashes and reboots

### Advanced Features
- 📋 **TASKS.md Integration** - Agents maintain task lists with automatic human-action flagging
- 🤖 **Autonomous Loop** - Goal-driven execution with step-by-step progress updates
- ✅ **Commit Gates** - Agents request sign-off before any git commit
- 📐 **Planning Mode** - Interactive Q&A sessions to gather requirements
- 🔄 **Context Persistence** - Context lives in the Claude process, not in memory arrays
- 🚨 **Human Task Flagging** - Agents flag tasks requiring human action and continue with other work

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

# Response idle timeout for persistent processes (milliseconds)
RESPONSE_IDLE_MS=3000

# Tools Claude can use
CLAUDE_TOOLS=Bash,Read,Write,Edit,Glob,Grep
```

### 4. Configure Projects with Personas

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
    "dir": "/absolute/path/to/your/project",
    "persona": "You are Aria, a senior backend engineer and autonomous maintainer of the my-api project.\n\nNorth star: Keep this API fast, well-tested, and production-stable.\n\nStack: Node.js, Postgres, Railway.\n\nRules:\n- Always write tests for new functions\n- Never modify migration files that have already run\n- Prefer explicit error handling over silent failures\n- When in doubt, ask via Telegram before acting\n\nYou must maintain TASKS.md in the project root:\n- Mark tasks [-] when starting, [x] when done, [!] when human action needed\n- Output HUMAN_ACTION_REQUIRED: <description> when you encounter tasks requiring human action\n- Output AWAITING_HUMAN when all remaining tasks need human input\n\nConfirm you have loaded this context by replying: \"Aria ready.\""
  }
]
```

**Important:**
- Use **absolute paths** for project directories
- Each `token` must be from a different bot (from BotFather)
- Each `name` must be unique
- Include `persona` field for autonomous capabilities (optional, defaults to generic assistant)

### 5. Start the Bridge

```bash
npm start
# or
pm2 start ecosystem.config.js
```

### 6. Test Your Bots

1. Open Telegram and find your bot(s)
2. Send `/start` to see the welcome message
3. Send `/help` to see all available commands
4. Try a simple prompt: "What files are in this directory?"

## Commands

### Basic Commands
- `/start` - Show welcome message
- `/help` - Show all available commands
- `/status` - Show bot status, agent state, and task counts

### Persona Commands
- `/persona` - Display current persona
- `/update-persona <text>` - Update persona and reload agent
- `/reset` - Clear context and reload persona

### Task Management
- `/tasks` - Show current TASKS.md contents
- `/done <task>` - Mark a human task as complete

### Autonomous Mode
- `/run <goal>` - Start autonomous loop with a goal
- `/approve` - Approve pending commit
- `/reject` - Reject pending commit
- `/stop` - Stop autonomous loop

### Planning Mode
- `/plan <topic>` - Start interactive planning session
- `/plan-confirm` - Confirm and save proposed TASKS.md

## Usage Examples

### Basic Prompts

Just send any message to execute it as a Claude prompt:

```
Fix the bug in auth.ts
```

```
Add error handling to the login function
```

```
Run the tests and show me the results
```

### Using Personas

View and update your agent's persona:

```
/persona
```

```
/update-persona You are a senior DevOps engineer. Always validate changes before applying. Document all infrastructure changes.
```

```
/reset
```

### Task Management

View and manage tasks:

```
/tasks
```

```
/done SSL certificate setup
```

### Autonomous Mode

Start a goal-driven autonomous session:

```
/run Refactor the payment module to use Stripe v3
```

The agent will work step-by-step, sending you updates and requesting approval before commits:

```
📝 [my-api] Ready to commit:

  refactor: extract PaymentService from routes

  Changed files:
  - src/services/PaymentService.js (new)
  - src/routes/payments.js (modified)

Reply /approve to commit or /reject to skip.
```

Stop the loop at any time:

```
/stop
```

### Planning Mode

Gather requirements interactively:

```
/plan redesign the authentication flow
```

The agent will ask questions:

```
❓ [my-api] Question 1

Which authentication strategy should we use?

1. JWT tokens
2. Session-based auth
3. OAuth2 (Google/GitHub)
4. Magic link email

Reply with the number or text of your choice.
```

After gathering requirements, the agent proposes a TASKS.md:

```
📋 [my-api] Plan Complete!

Generated after 5 questions.

Here's the proposed TASKS.md:
...

Reply /plan-confirm to save it, or send feedback for revision.
```

## Persona Design Guide

Personas define your agent's identity, north star, and operating rules. A good persona includes:

1. **Identity** - Who the agent is (role, expertise, tone)
2. **North Star** - The overarching goal for the project
3. **Stack** - Key technologies and frameworks
4. **Rules** - Standing instructions and constraints
5. **TASKS.md Instructions** - How to maintain task lists
6. **Confirmation** - A specific phrase to confirm loading

### Example Persona Template

```
You are [NAME], a [ROLE] and autonomous maintainer of the [PROJECT] project.

North star: [OVERARCHING GOAL]

Stack: [TECHNOLOGIES]

Rules:
- [RULE 1]
- [RULE 2]
- [RULE 3]

You must maintain TASKS.md in the project root:
- Mark tasks [-] when starting, [x] when done, [!] when human action needed
- Output HUMAN_ACTION_REQUIRED: <description> when encountering tasks requiring human action
- Output AWAITING_HUMAN when all remaining tasks need human input

Confirm you have loaded this context by replying: "[NAME] ready."
```

## Architecture

### Persistent Process Model

Each bot spawns exactly one `claude` process on startup and keeps it alive. Commands are written to stdin; responses are read from stdout.

```javascript
const proc = spawn('claude', ['--dangerously-skip-permissions'], {
  cwd: project.dir,
  stdio: ['pipe', 'pipe', 'pipe']
});

// Inject persona once at startup
proc.stdin.write(project.persona + '\n');

// Send a user message
proc.stdin.write(userMessage + '\n');
```

### Response Completion Detection

- **Primary**: Watch for Claude's input prompt pattern in stdout
- **Fallback**: Idle timeout (default 3 seconds) if no new stdout data

### Process Watchdog

Checks process health every 5 seconds. If crashed:
1. Spawns new process
2. Reinjects persona
3. Marks as ready
4. Sends Telegram notification

### TASKS.md Format

```markdown
# TASKS.md — my-api

## In Progress
- [-] Refactor PaymentService to use Stripe v3

## Pending
- [ ] Add rate limiting to /api/auth endpoints
- [!] Set up production SSL certificate — ⚠️ WAITING FOR HUMAN

## Completed
- [x] Extract charge logic into PaymentService (2026-03-16)
```

**Task States:**
- `[ ]` - Pending
- `[-]` - In progress
- `[x]` - Completed (with date)
- `[!]` - Blocked (requires human action)

## PM2 Management

```bash
# Start the bridge
pm2 start ecosystem.config.js

# View status
pm2 status

# View logs
pm2 logs

# Restart
pm2 restart claude-telegram

# Stop
pm2 stop claude-telegram

# Enable startup on reboot
pm2 startup
pm2 save
```

## Troubleshooting

### Bot not responding
1. Check PM2 status: `pm2 status`
2. Check logs: `pm2 logs claude-telegram`
3. Verify bot tokens in `projects.json`
4. Verify your user ID in `.env`

### Agent initialization fails
1. Check if `claude` CLI is in PATH: `which claude`
2. Check project directories exist and are accessible
3. View agent logs in PM2: `pm2 logs --lines 50`

### Persona not loading
1. Check persona format in `projects.json`
2. Ensure confirmation phrase is present
3. Use `/reset` to reload persona
4. Check for JSON syntax errors: `node -e "require('./projects.json')"`

### Process crashes frequently
1. Check Claude CLI version is up to date
2. Review error logs: `pm2 logs --err`
3. Check available memory: `free -h`
4. Watchdog will auto-restart, but frequent crashes indicate a deeper issue

### Planning/Autonomous mode hangs
1. Check response idle timeout in `.env` (RESPONSE_IDLE_MS)
2. Agent may be waiting for user input - check /status
3. Use `/stop` to exit autonomous mode
4. Use `/reset` to clear agent state

## Security Considerations

⚠️ **Important Security Notes:**

1. **--dangerously-skip-permissions**: All Claude Code execution runs with permissions auto-approved. Only use in trusted environments.
2. **Never commit tokens**: `.env` and `projects.json` are gitignored. Keep them secure.
3. **Whitelist only trusted users**: Anyone with access can run arbitrary code in your projects.
4. **Use personas wisely**: Personas can establish rules, but the agent can still be instructed to bypass them.
5. **Review commits**: Always review commit sign-offs before approving.

## Development

### Running in Development

```bash
# Run without PM2
node bot.js

# Test agent module
node test-agent.js
```

### File Structure

```
claude-telegram/
  ├── bot.js              # Main bot process
  ├── agent.js            # Persistent Claude process management
  ├── persona.js          # Persona injection and management
  ├── tasks.js            # TASKS.md management
  ├── loop.js             # Autonomous loop
  ├── planner.js          # Planning mode
  ├── config.js           # Configuration loader
  ├── projects.json       # Project configurations
  ├── .env                # Environment variables
  └── ecosystem.config.js # PM2 configuration
```

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

## Support

For issues, questions, or feedback:
- Open an issue on GitHub
- Check the troubleshooting section
- Review logs with `pm2 logs`
