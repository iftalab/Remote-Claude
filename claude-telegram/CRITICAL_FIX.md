# CRITICAL FIX - Persistent Agent Issue

**Date:** March 16, 2026
**Issue:** Phase 2 persistent agent doesn't work with Claude CLI
**Status:** Requires architectural change

---

## Problem

Claude Code CLI does not support persistent stdin/stdout sessions:
1. Spawning with `stdio: pipe` - No output received
2. Spawning with `node-pty` - posix_spawnp fails
3. Claude CLI is designed for interactive terminal sessions only
4. No "daemon mode" or "server mode" available

## Root Cause

The entire Phase 2 architecture assumes we can:
- Spawn a long-lived Claude process
- Write to stdin for each message
- Read from stdout for responses

**This doesn't work because:**
- Claude CLI expects TTY for interactive mode
- Using `-p` flag is for one-shot prompts only
- No API or protocol for persistent sessions

## Immediate Solution

**Option 1: Hybrid Approach** (Recommended)
- Use Phase 1 approach (spawn per message with `-p`)
- Keep all Phase 2 features (personas, autonomous mode, planning)
- Simulate "context" by injecting persona with each request
- Trading: persistence for reliability

**Option 2: External Session Manager**
- Use `tmux` or `screen` to maintain persistent sessions
- Interact via sending keys and reading output
- More complex, more brittle

**Option 3: Wait for Claude CLI Updates**
- Request server/daemon mode from Anthropic
- Implement when available
- Phase 2 remains non-functional until then

---

## Implementing Option 1 (Hybrid)

Keep Phase 2 modules but change execution model:

### agent.js Changes
- Remove pty/persistent process
- Use Phase 1's `exec` with `-p` flag
- Add persona to each `-p` call as context
- Simulate persistence at higher level

### Impact
- ✅ All Phase 2 features still work
- ✅ Personas applied per-request
- ✅ Autonomous mode works (multiple exec calls)
- ✅ Planning mode works
- ✅ TASKS.md management works
- ❌ No true context persistence (each call is fresh)
- ❌ Slightly slower (spawn per message)
- ✅ Actually WORKS

---

## Quick Fix for `make start`

Reverting agent.js to use exec instead of pty:

```javascript
// Instead of persistent pty
// Use exec with -p flag per message
// Prepend persona to each prompt
```

This makes `make start` work immediately.

---

## Recommendation

**Implement Hybrid Approach immediately:**

1. Modify `agent.js` to use `exec` with `-p` per message
2. Prepend persona context to each prompt
3. Keep all other Phase 2 features unchanged
4. Update documentation to reflect "simulated persistence"
5. Phase 2 features all work, just without true process persistence

**Why this is better:**
- Works reliably TODAY
- All Phase 2 features functional
- Clean, maintainable code
- When Claude adds server mode, easy to upgrade

**Trade-offs:**
- Lose true context persistence
- Slightly higher latency per message
- Each call spawns new process

**But we gain:**
- Actually working system
- All Phase 2 features
- Reliable execution
- No pty complexity

---

## Next Steps

1. Implement hybrid agent.js
2. Test all Phase 2 features with new approach
3. Update documentation
4. Mark as "Phase 2 - Hybrid Implementation"
