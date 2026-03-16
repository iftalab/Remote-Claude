# Testing Guide

## Quick Test via Telegram

### Step 1: Open Your Bot
- **Claude Bridge Bot**: @ifta_remote_claude_98983434_bot
- **Mini SaaS Bot**: @ifta_saas_1_98983434_bot

### Step 2: Send Test Messages

```
/start          → Initialize bot
hi              → Should respond in ~3-5 seconds
what is 2+2?    → Should respond with "2 + 2 = 4"
list files      → Will use tools (may take 5-15 seconds)
```

### Step 3: Check What's Happening

**Watch logs in real-time:**
```bash
make logs
```

**Or specific bot logs:**
```bash
tail -f claude-telegram/logs/bot-out.log
```

**Check history file:**
```bash
cat .claude-history.jsonl | tail -5
```

## Expected Flow

1. **You send**: "hi"
2. **Bot logs show**:
   ```
   🔧 [Claude Bridge] Sending prompt to agent (2 chars)
   [Claude Agent SDK] Sending message (2 chars)
   [Claude Agent SDK] Got response (36 chars)
   ✅ [Claude Bridge] Got response from agent (35 chars)
   ```
3. **You receive**: "Hello! 👋 How can I help you today?"

## What Success Looks Like

✅ Response in 3-10 seconds
✅ No timeout errors
✅ Responses make sense
✅ Can handle follow-up questions
✅ History shows up in UI at http://localhost:3000

## If Something Goes Wrong

**No response at all:**
```bash
pm2 status          # Check if bot is online
make logs           # Check for errors
```

**Timeout errors:**
- Check logs for actual error message
- SDK should handle this automatically now

**Wrong responses:**
- Check the persona is loaded correctly
- Look at history in UI to see what was sent

## Test Checklist

- [ ] Bot responds to "hi"
- [ ] Bot responds to "what is 2+2?"
- [ ] Bot can use tools (e.g., "list files")
- [ ] History logged to `.claude-history.jsonl`
- [ ] History visible in UI at http://localhost:3000
- [ ] No crashes or restarts in PM2
- [ ] Response times under 15 seconds
