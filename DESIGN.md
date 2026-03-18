# Remote Claude - System Design

**A Telegram bridge for Claude Code CLI with conversation persistence and multi-chat support.**

---

## Architecture

```
Telegram Users → Telegram Bot → Claude Agent SDK → Claude Code CLI
                      ↓
                 Session Map (per chat)
                      ↓
                 Session Files (~/.claude/projects/)
```

### Components

**1. Telegram Bot** (`claude-telegram/bot.js`)
- Multi-project support (one bot per project)
- Routes messages to appropriate Claude agent
- Tracks session ID per chat in `chatSessions` Map
- Logs all conversations to `.claude-history.jsonl`

**2. Claude Agent** (`claude-telegram/agent-sdk.js`)
- Uses official `@anthropic-ai/claude-agent-sdk`
- Manages session IDs for conversation continuity
- Returns `{response, sessionId}` from each message
- Supports process reconnection via PID tracking

**3. Web UI** (`claude-telegram-ui/`)
- React + Vite + Tailwind CSS
- Express server at `http://localhost:3000`
- Project management and process selection
- History viewer and task display

---

## Session Continuity (Core Feature)

### Problem
Each Telegram message was treated as a new Claude session with no memory.

### Solution
Use Claude Agent SDK's session management with `resume: sessionId`.

### Implementation

**Data Structure:**
```javascript
botInfo.chatSessions = Map<chatId, sessionId>
// Example: { 12345 → "abc-123-def", 67890 → "xyz-456-ghi" }
```

**Flow:**
```
Message 1: "My name is Alice"
  → No session ID for chat → Create new session
  → Capture sessionId: "abc-123"
  → Store: chatSessions.set(chatId, "abc-123")

Message 2: "What's my name?"
  → Get session: chatSessions.get(chatId) → "abc-123"
  → Resume session: query({resume: "abc-123"})
  → Claude has full context → "Your name is Alice"
```

**Key Points:**
- Each chat has isolated session (multi-chat support)
- Sessions persist across restarts (stored in `~/.claude/projects/`)
- `/reset` clears session for that chat only
- No token waste (context managed by SDK)

---

## Process Management

### Features
- Track Claude Code process IDs in `projects.json`
- Reconnect to existing processes on service restart
- UI for discovering and selecting running processes
- API endpoint: `GET /api/processes` (lists all Claude Code processes)

### Implementation

**Process Tracking:**
```javascript
project = {
  name: "My Project",
  token: "telegram-bot-token",
  dir: "/path/to/project",
  processId: 12345  // ← Tracked PID
}
```

**Reconnection Logic:**
```javascript
if (project.processId) {
  const reconnected = await agent.tryReconnect(project.processId)
  if (reconnected) {
    // Use existing process
  } else {
    // Process dead, spawn new
  }
}
```

---

## Design Decisions

### 1. Why SDK Instead of Raw stdin/stdout?
- **Problem:** Claude CLI has interactive UI with ANSI codes
- **Solution:** `@anthropic-ai/claude-agent-sdk` handles all complexity
- **Result:** Clean async API, 3-10s responses

### 2. Why Map<chatId, sessionId>?
- **Problem:** Multiple users need isolated conversations
- **Solution:** One session ID per chat, stored in Map
- **Result:** Unlimited concurrent chats with zero cross-contamination

### 3. Why Not Send Persona Inline?
- **Problem:** Large personas (9KB+) caused 2-3 minute delays
- **Solution:** Store PERSONA.md in project, Claude reads it once
- **Result:** First message 15-45s, subsequent 5-10s

### 4. Why Track Process IDs?
- **Problem:** Service restart lost all Claude Code processes
- **Solution:** Store PIDs, verify on restart, reconnect if alive
- **Result:** Zero downtime conversation continuity

---

## Configuration

### Environment (`.env`)
```bash
ALLOWED_IDS=123456789,987654321  # Telegram user IDs
EXEC_TIMEOUT_MS=120000           # 2 minutes default
CLAUDE_TOOLS=Bash,Read,Write,Edit,Glob,Grep
```

### Projects (`projects.json`)
```json
[
  {
    "name": "My Project",
    "token": "bot-token-from-botfather",
    "dir": "/absolute/path/to/project",
    "processId": null,
    "persona": "Optional inline persona"
  }
]
```

---

## Session Storage

**Location:** `~/.claude/projects/<encoded-dir>/<session-id>.jsonl`

**Format:**
```jsonl
{"type":"user","content":"My name is Alice"}
{"type":"assistant","content":"Nice to meet you!"}
{"type":"user","content":"What's my name?"}
{"type":"assistant","content":"Your name is Alice"}
```

**Lifecycle:**
- Created on first message
- Appended with each turn
- Loaded on `resume: sessionId`
- Persists indefinitely (manual cleanup required)

---

## API

### Agent SDK Methods

**sendMessage(message, sessionId)**
```javascript
const result = await agent.sendMessage("Hello", sessionId)
// Returns: {response: "Hi there!", sessionId: "abc-123"}
```

**resetSession()**
```javascript
agent.resetSession()  // Next message starts fresh
```

**getSessionId()**
```javascript
const sessionId = agent.getSessionId()  // Current session
```

### Bot Handlers

**handlePrompt(botInfo, msg)**
- Retrieves session for chat
- Sends message with session ID
- Stores returned session ID
- Sends response to Telegram

**handleResetCommand(botInfo, chatId)**
- Deletes session from Map
- Next message creates new session

---

## Testing

### Automated Tests

**test-session-continuity.js**
```bash
cd claude-telegram
node test-session-continuity.js
```

Validates:
1. Message: "My favorite color is purple"
2. Message: "What did I say my favorite color was?"
3. Verify response contains "purple"

**test-telegram-session.js**
```bash
node test-telegram-session.js
```

Sends actual Telegram messages to verify end-to-end flow.

### Manual Testing
1. Send message to bot
2. Send follow-up question about previous message
3. Verify Claude remembers context

---

## Performance

### Response Times
- **First message:** 3-10s (new session)
- **Subsequent:** 3-10s (resume session)
- **With tools:** 10-30s depending on operation
- **Timeout:** 120s (configurable)

### Token Efficiency
- **Before:** Every message re-sent entire context
- **After:** SDK manages context internally
- **Savings:** ~70-90% token reduction for long conversations

---

## Commands

### Telegram Commands
- `/start` - Welcome message
- `/help` - Command list
- `/status` - Bot status and stats
- `/reset` - Clear session for this chat
- `/persona` - Show current persona
- `/tasks` - Show TASKS.md
- `/run <goal>` - Start autonomous loop
- `/plan <topic>` - Start planning session

### PM2 Management
```bash
pm2 start ecosystem.config.js     # Start bot + UI
pm2 restart claude-telegram-bot   # Restart bot
pm2 logs claude-telegram-bot      # View logs
pm2 status                         # Check status
```

---

## Security

### Authentication
- Whitelist-based: `ALLOWED_IDS` in `.env`
- Unauthorized messages silently dropped
- No API keys in Telegram messages

### Sandboxing
- `dangerouslySkipPermissions: true` (local use only)
- Each project isolated to its directory
- Sessions isolated per chat

### Data Privacy
- All data local (`~/.claude/projects/`)
- No cloud storage
- Server binds to localhost only

---

## File Structure

```
remote-claude/
├── claude-telegram/           # Bot service
│   ├── bot.js                # Main bot logic
│   ├── agent-sdk.js          # Claude agent with sessions
│   ├── persona.js            # Persona + PID management
│   ├── projects.json         # Project configs
│   ├── .env                  # Environment vars
│   ├── test-session-continuity.js
│   └── test-telegram-session.js
├── claude-telegram-ui/        # Web UI
│   ├── server.js             # Express API server
│   ├── src/
│   │   ├── pages/            # React pages
│   │   ├── components/       # React components
│   │   └── api.js            # API client
│   └── dist/                 # Built UI
├── ecosystem.config.js        # PM2 config
└── DESIGN.md                  # This file
```

---

## Troubleshooting

### Session Not Persisting
1. Check `chatSessions` Map is populated
2. Verify session ID captured from response
3. Ensure session ID passed to `sendMessage()`

### Process Reconnection Fails
1. Check process is running: `ps aux | grep claude`
2. Verify PID in `projects.json` is correct
3. Check process is actually Claude Code (not other node process)

### Timeout Issues
1. Increase `EXEC_TIMEOUT_MS` in `.env`
2. Check operation isn't hanging (test with simple message)
3. View logs: `pm2 logs claude-telegram-bot`

---

## Future Enhancements

- **Session Management UI:** View/delete/export sessions per chat
- **Session Analytics:** Track message count, token usage
- **Auto-cleanup:** Remove sessions older than N days
- **Session Fork:** Branch conversations
- **Multi-device Sync:** Share sessions across Telegram clients

---

## References

- [Claude Agent SDK - Sessions](https://platform.claude.com/docs/en/agent-sdk/sessions)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [PM2 Process Manager](https://pm2.keymetrics.io/)

---

*Last Updated: March 18, 2026*
*Architecture: Session-based conversation continuity with process persistence*
