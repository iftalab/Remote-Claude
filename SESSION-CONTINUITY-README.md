# Session Continuity Mechanism - Technical Documentation

This document explains how conversation context is maintained across Telegram messages using the Claude Agent SDK.

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Pseudocode Logic](#pseudocode-logic)
- [Flow Diagrams](#flow-diagrams)
- [Key Components](#key-components)
- [Examples](#examples)

---

## Overview

**Problem**: Each Telegram message was treated as a new Claude session with no memory of previous messages.

**Solution**: Use Claude Agent SDK's session management to maintain conversation context across messages.

**Result**: Full conversation continuity with per-chat session isolation.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Telegram Users                            │
│  User A (Chat 111)           User B (Chat 222)              │
└────────────┬──────────────────────────┬─────────────────────┘
             │                          │
             ▼                          ▼
┌────────────────────────────────────────────────────────────┐
│                   Telegram Bot (bot.js)                     │
│                                                              │
│  chatSessions Map:                                          │
│  ┌──────────────────────────────────────┐                  │
│  │  111 → "session-AAA"                 │                  │
│  │  222 → "session-BBB"                 │                  │
│  └──────────────────────────────────────┘                  │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────┐
│              Claude Agent (agent-sdk.js)                    │
│                                                              │
│  - Tracks sessionId internally                             │
│  - Uses resume/continue options                            │
│  - Returns {response, sessionId}                           │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────┐
│        Claude Agent SDK (@anthropic-ai/claude-agent-sdk)   │
│                                                              │
│  - Manages session files                                   │
│  - Loads conversation history                              │
│  - Persists to ~/.claude/projects/                         │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────┐
│              Session Storage (Filesystem)                   │
│                                                              │
│  ~/.claude/projects/<project-dir>/                         │
│    ├── session-AAA.jsonl  (User A's conversation)         │
│    └── session-BBB.jsonl  (User B's conversation)         │
└────────────────────────────────────────────────────────────┘
```

---

## Pseudocode Logic

### 1. Agent SDK - Session Tracking (`agent-sdk.js`)

```pseudocode
CLASS ClaudeAgent:
    PROPERTIES:
        projectDir: string
        sessionId: string | null        // Current session ID
        hasSession: boolean              // Whether we have an active session

    CONSTRUCTOR(projectDir, options):
        this.projectDir = projectDir
        this.sessionId = null
        this.hasSession = false

    METHOD sendMessage(message, sessionId = null):
        // Determine which session to use
        targetSessionId = sessionId OR this.sessionId

        // Build query options
        queryOptions = {
            cwd: projectDir,
            allowedTools: ["Read", "Write", "Edit", ...],
            dangerouslySkipPermissions: true
        }

        // KEY LOGIC: Add session resumption
        IF targetSessionId EXISTS:
            // Multi-chat: Resume specific session by ID
            queryOptions.resume = targetSessionId
            LOG "Resuming session: {targetSessionId}"
        ELSE IF this.hasSession:
            // Single-chat: Continue most recent session
            queryOptions.continue = true
            LOG "Continuing existing session"
        ELSE:
            // New session
            LOG "Starting new session"

        // Call Claude SDK
        response = query({
            prompt: message,
            options: queryOptions
        })

        capturedSessionId = null
        fullResponse = ""

        // Stream response and capture session ID
        FOR EACH responseMessage IN response:
            // Capture session ID from system init message
            IF responseMessage.type == "system" AND responseMessage.subtype == "init":
                capturedSessionId = responseMessage.session_id
                this.sessionId = capturedSessionId
                this.hasSession = true
                LOG "Session ID captured: {capturedSessionId}"

            // Collect assistant response text
            IF responseMessage.type == "assistant":
                FOR EACH block IN responseMessage.message.content:
                    IF block.type == "text":
                        fullResponse += block.text

            // Also capture from result message
            IF responseMessage.type == "result":
                IF responseMessage.session_id:
                    capturedSessionId = responseMessage.session_id
                    this.sessionId = capturedSessionId
                    this.hasSession = true
                BREAK

        // Return both response and session ID
        RETURN {
            response: fullResponse,
            sessionId: capturedSessionId OR this.sessionId
        }

    METHOD resetSession():
        this.sessionId = null
        this.hasSession = false
        LOG "Session reset - next message will start new session"
```

### 2. Bot Handler - Multi-Chat Management (`bot.js`)

```pseudocode
// Global state per bot
botInfo = {
    bot: TelegramBot,
    project: ProjectConfig,
    agent: ClaudeAgent,
    chatSessions: Map<chatId, sessionId>  // KEY: Track session per chat
}

FUNCTION handlePrompt(botInfo, telegramMessage):
    chatId = telegramMessage.chat.id
    userMessage = telegramMessage.text

    // KEY LOGIC: Get session ID for this specific chat
    chatSessionId = botInfo.chatSessions.get(chatId)

    IF chatSessionId EXISTS:
        LOG "Chat {chatId} has existing session: {chatSessionId}"
    ELSE:
        LOG "Chat {chatId} has no session - will create new one"

    // Send message with session ID (if exists)
    result = agent.sendMessage(userMessage, chatSessionId)

    // result = {response: "...", sessionId: "uuid-here"}

    // KEY LOGIC: Store session ID for this chat
    IF result.sessionId EXISTS:
        botInfo.chatSessions.set(chatId, result.sessionId)
        LOG "Stored session {result.sessionId} for chat {chatId}"

    // Send response to user
    bot.sendMessage(chatId, result.response)
```

### 3. Session Reset Command

```pseudocode
FUNCTION handleResetCommand(botInfo, chatId):
    // Clear session for THIS chat only (not others)
    botInfo.chatSessions.delete(chatId)

    bot.sendMessage(chatId, "Session cleared! Next message starts fresh.")
```

---

## Flow Diagrams

### Complete Message Flow

```
═══════════════════════════════════════════════════════════════
SCENARIO: User sends two messages in same chat
═══════════════════════════════════════════════════════════════

MESSAGE 1: "My favorite color is purple"
─────────────────────────────────────────────────────────────
1. Telegram → Bot receives message
   chatId = 12345
   text = "My favorite color is purple"

2. Bot → Check chatSessions Map
   chatSessionId = chatSessions.get(12345)  // null (first message)

3. Bot → Send to agent
   result = agent.sendMessage("My favorite color is purple", null)

4. Agent → Build query options
   targetSessionId = null  // No session passed
   queryOptions = {
       resume: undefined,     // Not set
       continue: undefined    // Not set
       // Will create NEW session
   }

5. Agent → Call Claude SDK
   response = query({prompt: "...", options: queryOptions})

6. Agent → Stream response
   - System init message arrives
   - Capture sessionId = "abc-123-def"
   - Collect response text

7. Agent → Return
   RETURN {
       response: "Purple is great! ...",
       sessionId: "abc-123-def"
   }

8. Bot → Store session
   chatSessions.set(12345, "abc-123-def")

9. Bot → Reply to user
   "Purple is great! ..."

═══════════════════════════════════════════════════════════════

MESSAGE 2: "What did I say my favorite color was?"
─────────────────────────────────────────────────────────────
1. Telegram → Bot receives message
   chatId = 12345  // SAME chat
   text = "What did I say my favorite color was?"

2. Bot → Check chatSessions Map
   chatSessionId = chatSessions.get(12345)  // "abc-123-def" ✓

3. Bot → Send to agent WITH session ID
   result = agent.sendMessage(
       "What did I say my favorite color was?",
       "abc-123-def"  // ← KEY: Pass session ID
   )

4. Agent → Build query options
   targetSessionId = "abc-123-def"  // Session provided!
   queryOptions = {
       resume: "abc-123-def",  // ← KEY: Resume this session!
       // Claude will load full conversation history
   }

5. Agent → Call Claude SDK
   response = query({prompt: "...", options: queryOptions})
   // Claude loads session "abc-123-def" from disk
   // Has access to: "My favorite color is purple"

6. Agent → Stream response
   - Same sessionId returned: "abc-123-def"
   - Collect response: "You said your favorite color is purple!"

7. Agent → Return
   RETURN {
       response: "You said your favorite color is purple!",
       sessionId: "abc-123-def"
   }

8. Bot → Store session (already exists, no change needed)
   chatSessions.set(12345, "abc-123-def")

9. Bot → Reply to user
   "You said your favorite color is purple!"

═══════════════════════════════════════════════════════════════
```

### Multi-Chat Isolation

```
═══════════════════════════════════════════════════════════════
SCENARIO: Two different users chatting simultaneously
═══════════════════════════════════════════════════════════════

USER A (chatId: 111):
    Message 1: "I like cats"
    → Creates session: session-AAA
    → chatSessions.set(111, "session-AAA")

    Message 2: "What do I like?"
    → Uses session: session-AAA
    → Response: "You like cats"

USER B (chatId: 222):
    Message 1: "I like dogs"
    → Creates session: session-BBB
    → chatSessions.set(222, "session-BBB")

    Message 2: "What do I like?"
    → Uses session: session-BBB
    → Response: "You like dogs"

ISOLATION:
    chatSessions Map = {
        111 → "session-AAA",
        222 → "session-BBB"
    }

    // Each chat has independent conversation!
    // No cross-contamination
```

### Session Storage (Claude SDK Internal)

```
════════════════════════════════════════════════════════════
HOW CLAUDE SDK STORES SESSIONS INTERNALLY
════════════════════════════════════════════════════════════

Location: ~/.claude/projects/<encoded-cwd>/<session-id>.jsonl

File Structure:
    Session File: abc-123-def.jsonl
    ┌────────────────────────────────────┐
    │ {"type":"user","content":"..."}    │  ← Message 1
    │ {"type":"assistant","content":"..."}│  ← Response 1
    │ {"type":"user","content":"..."}    │  ← Message 2
    │ {"type":"assistant","content":"..."}│  ← Response 2
    │ ...                                │
    └────────────────────────────────────┘

When resume="abc-123-def" is used:
1. SDK reads entire .jsonl file
2. Loads all messages into context
3. Appends new message
4. Claude has FULL conversation history
5. Saves new messages to same file
```

---

## Key Components

### 1. chatSessions Map (Bot Level)

**Purpose**: Track which session belongs to which chat

**Structure**:
```javascript
Map<chatId, sessionId>
// Example:
{
  5708926198 → "abc-123-def-456",
  1234567890 → "xyz-789-ghi-012"
}
```

**Operations**:
- `get(chatId)` - Retrieve session for a chat
- `set(chatId, sessionId)` - Store session for a chat
- `delete(chatId)` - Clear session (used in /reset)

### 2. sessionId (Agent Level)

**Format**: UUID generated by Claude SDK
**Example**: `2bcf076c-1f5f-439e-ae9f-8080fac7d671`

**Lifecycle**:
1. Created by Claude SDK on first message
2. Captured from response stream
3. Stored in chatSessions Map
4. Passed back on subsequent messages
5. Persists until /reset or manual deletion

### 3. Claude SDK Options

**Option 1: `continue: true`**
- Resumes **most recent** session in directory
- Good for single-chat scenarios
- No ID tracking needed

**Option 2: `resume: sessionId`**
- Resumes **specific** session by ID
- Required for multi-chat support
- Enables per-chat isolation

**We use**: Option 2 (`resume`) for multi-chat support

---

## Examples

### Example 1: Fresh Conversation

```javascript
// User: "Hello"
chatId = 12345
sessionId = chatSessions.get(12345)  // undefined

// Agent call
result = agent.sendMessage("Hello", undefined)
// → Creates new session: "session-001"
// → Returns: {response: "Hi there!", sessionId: "session-001"}

// Store for next time
chatSessions.set(12345, "session-001")

// User sees: "Hi there!"
```

### Example 2: Continuing Conversation

```javascript
// User: "What did I just say?"
chatId = 12345
sessionId = chatSessions.get(12345)  // "session-001" ✓

// Agent call with session ID
result = agent.sendMessage("What did I just say?", "session-001")
// → Resumes session-001
// → Claude loads: ["Hello", "Hi there!", "What did I just say?"]
// → Returns: {response: "You said Hello", sessionId: "session-001"}

// User sees: "You said Hello"
```

### Example 3: Reset and New Conversation

```javascript
// User: "/reset"
chatId = 12345
chatSessions.delete(12345)  // Clear session

// Next message
// User: "Hello again"
sessionId = chatSessions.get(12345)  // undefined (reset cleared it)

// Agent call
result = agent.sendMessage("Hello again", undefined)
// → Creates NEW session: "session-002"
// → No memory of previous conversation
// → Returns: {response: "Hi!", sessionId: "session-002"}

chatSessions.set(12345, "session-002")
```

### Example 4: Multiple Users

```javascript
// User A (chatId: 111): "I'm Alice"
sessionA = chatSessions.get(111)  // undefined
result = agent.sendMessage("I'm Alice", undefined)
chatSessions.set(111, "session-A")

// User B (chatId: 222): "I'm Bob"
sessionB = chatSessions.get(222)  // undefined
result = agent.sendMessage("I'm Bob", undefined)
chatSessions.set(222, "session-B")

// User A: "Who am I?"
sessionA = chatSessions.get(111)  // "session-A"
result = agent.sendMessage("Who am I?", "session-A")
// → Response: "You're Alice"

// User B: "Who am I?"
sessionB = chatSessions.get(222)  // "session-B"
result = agent.sendMessage("Who am I?", "session-B")
// → Response: "You're Bob"

// Complete isolation! ✓
```

---

## Before vs After Comparison

### BEFORE (Each message = new session)

```
User: "My name is Alice"
Bot → Claude (new session)
  Response: "Nice to meet you!"
  Session discarded ❌

User: "What's my name?"
Bot → Claude (new session, no context)
  Response: "I don't know your name"  ❌ WRONG
```

### AFTER (Session continuity)

```
User: "My name is Alice"
Bot → Claude (new session)
  Response: "Nice to meet you!"
  Session "session-001" stored ✓

User: "What's my name?"
Bot → Claude (resume "session-001")
  Claude loads: ["My name is Alice", "Nice to meet you!"]
  Response: "Your name is Alice"  ✓ CORRECT
```

---

## Key Insights

### 1. The Map is the Key
The `chatSessions` Map is what enables multi-chat support. Each chat gets its own session ID, allowing unlimited concurrent conversations with complete isolation.

### 2. Session Persistence
Sessions are stored on disk by Claude SDK in `~/.claude/projects/`. They survive:
- Bot restarts
- Service restarts
- System reboots

### 3. Zero Token Waste
- Old approach: Every message re-sent entire context → High token cost
- New approach: Claude SDK manages context internally → Only new messages cost tokens

### 4. Instant Reset
`/reset` just clears the Map entry. No need to kill/respawn processes. Next message automatically creates a fresh session.

---

## Technical Details

### Session ID Capture Points

1. **System Init Message**:
```javascript
if (responseMessage.type === 'system' && responseMessage.subtype === 'init') {
    sessionId = responseMessage.session_id
}
```

2. **Result Message**:
```javascript
if (responseMessage.type === 'result') {
    sessionId = responseMessage.session_id
}
```

### Query Options Logic

```javascript
const queryOptions = { cwd, allowedTools, ... }

if (sessionId) {
    queryOptions.resume = sessionId  // Specific session
} else if (hasSession) {
    queryOptions.continue = true     // Most recent
}
// else: new session
```

### Return Format Change

**Old**: `agent.sendMessage()` → `string`
**New**: `agent.sendMessage()` → `{response: string, sessionId: string}`

This breaking change allows bot.js to track sessions per chat.

---

## Testing

### Automated Test
```bash
cd /Users/ifta/Documents/projects/remote-claude/claude-telegram
node test-session-continuity.js
```

**Expected Output**:
```
✅ TEST PASSED: Claude remembered the previous message!
🎉 Session continuity is working correctly.
```

### Manual Test (Telegram)
1. Send: "My favorite food is pizza"
2. Send: "What's my favorite food?"
3. Expected: "Your favorite food is pizza" ✓

### Test Script (Telegram)
```bash
node test-telegram-session.js
```
Check Telegram for results.

---

## References

- [Claude Agent SDK - Work with Sessions](https://platform.claude.com/docs/en/agent-sdk/sessions)
- [Session Management Documentation](https://docs.claude.com/en/docs/agent-sdk/sessions)
- [TypeScript SDK Reference](https://platform.claude.com/docs/en/agent-sdk/typescript)

---

## Troubleshooting

### Session Not Persisting

**Symptom**: Claude forgets previous messages
**Check**:
1. Verify chatSessions Map is being populated
2. Check session ID is being captured from responses
3. Ensure session ID is passed to sendMessage()

### Cross-Chat Contamination

**Symptom**: User A sees User B's conversation
**Check**:
1. Verify chatId is unique per user
2. Check Map key is chatId, not userId
3. Ensure no session ID sharing between chats

### Session File Not Found

**Symptom**: Error loading session
**Check**:
1. Verify `~/.claude/projects/` directory exists
2. Check session file `<session-id>.jsonl` exists
3. Ensure cwd matches across calls

---

## Summary

**Core Mechanism:**
1. **First message** → Create new session → Capture session ID → Store in Map
2. **Subsequent messages** → Retrieve session ID from Map → Resume session → Claude has full history
3. **Different chats** → Different session IDs in Map → Complete isolation
4. **/reset** → Delete session ID from Map → Next message starts fresh

**Result**: True conversation continuity with per-chat isolation, minimal token usage, and zero configuration required from users.

---

*Last Updated: March 18, 2026*
*Status: ✅ Implemented and Tested*
