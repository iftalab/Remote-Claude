# Persona File Setup

## How It Works Now

Instead of sending the persona as a huge inline message (which caused timeouts), Claude now **reads the persona from a file**.

### Old Approach ❌
```
User: "hi"
Bot sends: "[9477 chars of persona]\n\nhi"
Claude: *takes 3 minutes to process*
```

### New Approach ✅
```
User: "hi"
Bot sends: "Read and load the PERSONA.md file in the current directory to understand your role and operating guidelines.\n\nhi"
Claude: *reads PERSONA.md file (~15 seconds)* → responds
```

---

## Response Times

**First message** (with persona file read):
- ⏱️ **15-45 seconds** (Claude reads and processes PERSONA.md)
- Timeout: 45 seconds

**All subsequent messages**:
- ⏱️ **5-10 seconds** for simple queries
- ⏱️ **10-30 seconds** for tool operations
- Timeout: 30 seconds

---

## Project Setup

Each project should have a `PERSONA.md` file in its root directory:

```
/Users/ifta/Documents/projects/Mini-SaaS-One/
├── PERSONA.md        ← Claude reads this on first message
├── PROJECT.md
├── TASKS.md
└── src/
```

### Creating a Persona File

1. Create `PERSONA.md` in your project directory
2. Write your agent's identity, rules, and operating guidelines
3. Bot will instruct Claude to read it on first message

### Example PERSONA.md Structure

```markdown
# PERSONA.md — Your Agent Name

## Who You Are
[Define the agent's identity and purpose]

## Core Mandate
[What the agent is supposed to accomplish]

## Operating Principles
[Rules and guidelines for behavior]

## Session Startup Protocol
[What to do at the start of each session]
```

---

## Current Projects

### ✅ Mini SaaS : 1
- **File**: `/Users/ifta/Documents/projects/Mini-SaaS-One/PERSONA.md`
- **Size**: 9,477 characters
- **Persona**: ARIA - Autonomous Revenue & Intelligence Agent
- **Status**: Created and ready

### ✅ Claude Bridge
- **Persona**: Simple default (290 chars)
- **No file needed** (persona is short enough to send inline)

---

## Testing

Send a message to **@ifta_saas_1_98983434_bot**:

1. **First message**: `hi`
   - Should respond in **15-45 seconds**
   - Claude reads PERSONA.md
   - Response shows ARIA personality

2. **Second message**: `what is 2+2?`
   - Should respond in **5-10 seconds**
   - No persona read (already loaded)
   - Fast response

---

## Benefits

✅ **Fast responses** - 5-10s for normal queries (vs 3 minutes before)
✅ **Version controlled** - PERSONA.md in git with your project
✅ **Easy to update** - Edit PERSONA.md, restart bot
✅ **No code changes** - Update persona without touching bot code
✅ **Sensible timeouts** - 30s normal, 45s for first message

---

## Troubleshooting

**First message still timing out?**
- Check that PERSONA.md exists in project directory
- Check file is readable (not too large)
- Increase first-message timeout in `agent-sdk.js` if needed

**Persona not loading?**
- Check logs: `tail -f claude-telegram/logs/bot-out.log`
- Look for: `[Claude Agent SDK] First message - instructing to read persona file`
- Verify PERSONA.md path is correct

**Want to update persona?**
- Edit PERSONA.md in your project
- Restart bot: `make restart`
- Send first message to reload
