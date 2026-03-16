# Debugging Execution Timeouts

## How to Debug Timeout Issues

### 1. Check the History Tab in UI

The conversation history now logs ALL messages, including errors and timeouts.

**Steps:**
1. Open UI at http://localhost:3000
2. Navigate to your project
3. Click the "History" tab
4. Look for:
   - Red "Error" entries showing timeout messages
   - The last successful message before timeout
   - What command/message triggered the timeout

### 2. Check Bot Logs

View real-time logs from the bot:

```bash
make logs
```

Look for:
- `[Persistent Agent] Timeout after Xms` - shows when timeout occurred
- `[Agent] Sending message (X chars)` - shows message size
- `[Agent] Got response (X chars)` - shows if response was received

### 3. Check Specific Project Log Files

Logs are stored in:
```
claude-telegram/logs/bot-out.log    # Standard output
claude-telegram/logs/bot-error.log  # Error output
```

View them:
```bash
tail -f claude-telegram/logs/bot-out.log
tail -f claude-telegram/logs/bot-error.log
```

### 4. Check History File Directly

Each project has a history file:
```
<project-dir>/.claude-history.jsonl
```

Example for Mini SaaS:
```bash
cat /Users/ifta/Documents/projects/Mini-SaaS-One/.claude-history.jsonl | tail -20
```

This shows the last 20 conversation entries in JSON format.

### 5. Increase Timeout

If operations legitimately take longer (e.g., running tests, building projects):

Edit `/Users/ifta/Documents/projects/remote-claude/claude-telegram/.env`:
```bash
# Default is 120000 (2 minutes)
# Increase to 5 minutes for complex operations:
EXEC_TIMEOUT_MS=300000
```

Then restart:
```bash
make restart
```

### 6. Test with Simple Messages

Start with very simple messages to test if the bot is working:

1. Send: `hi`
2. Send: `what files are in this directory?`
3. Send: `ls`

If these work but complex operations timeout, the issue is operation-specific.

### 7. Check Claude CLI Directly

Test Claude CLI without the bot to see if it's a Claude issue:

```bash
cd /Users/ifta/Documents/projects/Mini-SaaS-One
claude -p "list files in current directory"
```

If this is slow/times out, the issue is with Claude or your setup, not the bot.

## Common Causes of Timeouts

### 1. Large Persona
- **Problem**: Mini SaaS has an 8000+ character persona
- **Solution**: The persistent agent now loads persona ONCE at startup, not with every message
- **Verify**: Check logs for `Persona size: X chars` - should only appear at startup

### 2. Complex Operations
- Running tests, builds, or installations can take >2 minutes
- **Solution**: Increase `EXEC_TIMEOUT_MS` in `.env`

### 3. Large File Operations
- Reading/processing large files
- **Solution**: Ask Claude to work with smaller chunks or use grep/glob to narrow down

### 4. Network Issues
- If using cloud-based Claude API
- **Solution**: Check your network connection

### 5. System Resources
- Claude Code using too much CPU/memory
- **Solution**: Check system resources with `top` or Activity Monitor

## What Changed (Persistent Agent)

### Before (Hybrid Mode - BAD):
```
User sends message
  → Spawn NEW claude process
  → Load 8000 char persona
  → Process message
  → Return response
  → Kill process

Time: 2+ minutes PER MESSAGE
```

### After (Persistent Mode - GOOD):
```
Startup (once):
  → Spawn claude process
  → Load persona
  → Keep process alive

User sends message:
  → Write to stdin
  → Read from stdout
  → Return response

Time: Seconds, not minutes
```

## Testing the Fix

1. Restart the bot:
```bash
make restart
```

2. Look for this in logs:
```
[Persistent Agent] Spawning Claude process in /path/to/project
[Persistent Agent] Process ready
✓ Agent ready for project: Mini SaaS : 1
```

3. Send a message on Telegram

4. Check logs for:
```
[Persistent Agent] Sending message (X chars)
[Persistent Agent] Got response (Y chars)
```

Should see response in seconds, not minutes!

## Still Having Issues?

1. Check if process is actually persistent:
```bash
ps aux | grep claude
```

You should see a `claude` process running for each project.

2. Check history to see exact error:
   - UI → Project → History tab
   - Look for the error details

3. Try resetting the agent:
   - Send `/reset` command on Telegram
   - This kills and respawns the process

4. Check if it's a specific command timing out:
   - Test with simple commands first
   - Gradually increase complexity
