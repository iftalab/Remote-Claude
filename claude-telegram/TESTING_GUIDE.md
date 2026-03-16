# Phase 2 Testing Guide

Comprehensive testing checklist for all Phase 2 features.

---

## Phase 2.8: Testing & Validation

### TASK-50: Test Persistent Process ✅

**Test 1: Process spawns correctly**
- [ ] Run `npm start`
- [ ] Check logs for "Agent spawned successfully" messages
- [ ] Verify no errors in PM2 logs: `pm2 logs`

**Test 2: stdin/stdout communication**
- [ ] Send a simple prompt via Telegram: "echo hello"
- [ ] Verify response is received
- [ ] Check agent logs show stdin write and stdout read

**Test 3: Response completion detection**
- [ ] Send a quick command: "ls"
- [ ] Send a slow command: "find . -name '*.js'"
- [ ] Verify both complete correctly without hanging

**Test 4: Process stays alive**
- [ ] Send multiple messages in a row
- [ ] Check PM2 status shows same process uptime
- [ ] Verify context is maintained across messages

**Test 5: Process watchdog on crash**
- [ ] Find Claude process ID: `ps aux | grep claude`
- [ ] Kill it manually: `kill -9 <pid>`
- [ ] Wait 5 seconds
- [ ] Check logs for "Agent crashed" and "Process restarted"
- [ ] Send a message to verify agent works again

**Test 6: /reset command**
- [ ] Send `/reset`
- [ ] Verify agent kills and restarts
- [ ] Verify persona is reinjected
- [ ] Check context is cleared (ask about previous messages)

---

### TASK-51: Test Persona System ✅

**Test 1: Persona injection on startup**
- [ ] Check logs for "Injecting persona"
- [ ] Check logs for persona confirmation (e.g., "Aria ready")
- [ ] Verify agent is marked ready

**Test 2: /persona command**
- [ ] Send `/persona`
- [ ] Verify full persona is displayed
- [ ] Check formatting is correct

**Test 3: /update-persona command**
- [ ] Send `/update-persona You are TestBot for testing. Reply "TestBot ready."`
- [ ] Verify projects.json is updated
- [ ] Verify agent restarts
- [ ] Send `/persona` to confirm update

**Test 4: Persona survives /reset**
- [ ] Set a custom persona
- [ ] Send `/reset`
- [ ] Send `/persona` to verify it persists

**Test 5: Multiple personas across bots**
- [ ] Configure 2+ bots with different personas
- [ ] Send `/persona` to each
- [ ] Verify each shows correct persona

---

### TASK-52: Test TASKS.md Management ✅

**Test 1: TASKS.md creation**
- [ ] Ensure project has no TASKS.md
- [ ] Send `/tasks`
- [ ] Verify TASKS.md is created with template

**Test 2: Task state transitions**
- [ ] Manually add a task to TASKS.md: `- [ ] Test task`
- [ ] Ask agent to work on it
- [ ] Verify it marks task as `[-]` when starting
- [ ] Verify it marks task as `[x]` when done (with date)

**Test 3: Human action flagging**
- [ ] Ask agent to do something requiring human action (e.g., "deploy to production")
- [ ] Verify it marks task `[!]` in TASKS.md
- [ ] Verify Telegram alert is sent
- [ ] Verify agent continues with other work (doesn't hang)

**Test 4: /tasks command**
- [ ] Send `/tasks`
- [ ] Verify full TASKS.md contents are sent
- [ ] Verify task counts summary is shown
- [ ] Test with long TASKS.md (>4000 chars) to verify chunking

**Test 5: /done command**
- [ ] Flag a human task (or manually add `[!]` task)
- [ ] Send `/done <task description>`
- [ ] Verify agent marks it complete
- [ ] Verify agent resumes blocked work

**Test 6: AWAITING_HUMAN flow**
- [ ] Give agent a goal with multiple human tasks
- [ ] Wait for all autonomous tasks to complete
- [ ] Verify AWAITING_HUMAN signal triggers
- [ ] Verify proper Telegram message

---

### TASK-53: Test Autonomous Loop ✅

**Test 1: /run with simple goal**
- [ ] Send `/run Create a hello.txt file with "Hello World"`
- [ ] Verify loop starts
- [ ] Verify step updates are sent to Telegram
- [ ] Verify goal completes
- [ ] Check hello.txt was created

**Test 2: Loop status updates**
- [ ] Start a multi-step goal
- [ ] Verify update message after each step
- [ ] Verify format: "🔄 [project] Step N"
- [ ] Verify updates include progress summary

**Test 3: Commit sign-off gate**
- [ ] Start a goal that requires a git commit
- [ ] Verify loop pauses before commit
- [ ] Verify commit sign-off message sent to Telegram
- [ ] Verify diff/summary included

**Test 4: /approve and /reject**
- [ ] Trigger a commit sign-off
- [ ] Send `/approve` - verify commit proceeds
- [ ] Trigger another commit
- [ ] Send `/reject` - verify commit skipped
- [ ] Verify loop continues in both cases

**Test 5: /stop command**
- [ ] Start a long-running goal
- [ ] Send `/stop` mid-execution
- [ ] Verify loop stops gracefully
- [ ] Verify summary message sent

**Test 6: Goal completion**
- [ ] Start a simple, achievable goal
- [ ] Wait for completion
- [ ] Verify "Goal Complete" message
- [ ] Verify loop stops automatically

**Test 7: Loop with TASKS.md**
- [ ] Ensure TASKS.md exists with tasks
- [ ] Start autonomous loop
- [ ] Verify agent updates TASKS.md as it works
- [ ] Verify task states change appropriately

---

### TASK-54: Test Planning Mode ✅

**Test 1: /plan command**
- [ ] Send `/plan redesign authentication`
- [ ] Verify planning session starts
- [ ] Verify first question is asked

**Test 2: Multiple choice questions**
- [ ] Wait for a multiple choice question
- [ ] Verify options are formatted as numbered list
- [ ] Reply with a number (e.g., "2")
- [ ] Verify answer is accepted

**Test 3: Free text questions**
- [ ] Wait for a free text question
- [ ] Reply with natural language answer
- [ ] Verify answer is accepted
- [ ] Verify next question comes

**Test 4: PLAN_COMPLETE detection**
- [ ] Continue answering questions
- [ ] Wait for agent to have enough information
- [ ] Verify PLAN_COMPLETE message
- [ ] Verify proposed TASKS.md is sent

**Test 5: /plan-confirm**
- [ ] Wait for proposed plan
- [ ] Send `/plan-confirm`
- [ ] Verify TASKS.md is created in project directory
- [ ] Verify contents match proposed plan

**Test 6: Plan revision flow**
- [ ] Wait for proposed plan
- [ ] Send feedback: "Add more detail to task 3"
- [ ] Verify agent revises plan
- [ ] Verify revised plan is sent
- [ ] Send `/plan-confirm` to finalize

---

### TASK-55: Integration Testing ✅

**Test 1: Full workflow - planning to completion**
- [ ] Send `/plan build a calculator`
- [ ] Answer all questions
- [ ] Send `/plan-confirm`
- [ ] Send `/run Implement the calculator`
- [ ] Approve commits as needed
- [ ] Wait for completion
- [ ] Send `/tasks` to verify all tasks marked complete

**Test 2: Human task workflow**
- [ ] Send `/run Deploy to production`
- [ ] Verify human tasks are flagged
- [ ] Complete external tasks
- [ ] Send `/done <task>` for each
- [ ] Verify agent resumes

**Test 3: Multiple concurrent bots**
- [ ] Configure 2+ bots
- [ ] Send different goals to each simultaneously
- [ ] Verify no cross-contamination
- [ ] Verify each maintains its own state

**Test 4: State isolation**
- [ ] Start autonomous loop on Bot A
- [ ] Start planning session on Bot B
- [ ] Verify they don't interfere
- [ ] Verify each tracks its own state

**Test 5: PM2 restart recovery**
- [ ] Start autonomous loop or planning session
- [ ] Restart PM2: `pm2 restart claude-telegram`
- [ ] Verify agents respawn
- [ ] Verify personas reinject
- [ ] Note: Active sessions will be lost (expected)

**Test 6: Long-running autonomous session**
- [ ] Start a complex, long goal (est. 1+ hour)
- [ ] Monitor for memory leaks
- [ ] Monitor for crashes
- [ ] Verify agent maintains context throughout
- [ ] Verify watchdog handles any issues

---

## Phase 2.9: Production Deployment

### TASK-56: Security Review ✅

**Security Checklist:**

- [ ] **Understand --dangerously-skip-permissions**
  - All Claude Code tool calls are auto-approved
  - Agent can run arbitrary code without confirmation
  - Only deploy in trusted, isolated environments
  - Document this risk in README

- [ ] **Protect secrets**
  - `.env` is gitignored
  - `projects.json` is gitignored
  - Bot tokens never hardcoded
  - User IDs never hardcoded

- [ ] **Whitelist validation**
  - ALLOWED_IDS is enforced
  - Unauthorized users get no response
  - Test with unauthorized account

- [ ] **Persona safety**
  - Personas establish guidelines but aren't security boundaries
  - Users can override persona rules with instructions
  - Don't rely on personas alone for security

- [ ] **Review commit gates**
  - All commits require manual approval
  - Diff is shown before approval
  - No auto-commit ever

- [ ] **Rate limiting considerations**
  - Telegram has rate limits (30 msg/sec)
  - Claude API has rate limits
  - Consider implementing request throttling

---

### TASK-57: Production Readiness ✅

**Performance Testing:**
- [ ] Test with 3+ concurrent projects
- [ ] Measure memory usage over 24 hours
- [ ] Measure CPU usage during autonomous loops
- [ ] Check for memory leaks (use `node --inspect`)
- [ ] Verify response times are acceptable

**Error Recovery:**
- [ ] Test network interruptions
- [ ] Test Telegram API downtime
- [ ] Test Claude CLI crashes
- [ ] Test disk full scenario
- [ ] Verify all errors are logged

**Log Rotation:**
- [ ] Configure PM2 log rotation
- [ ] Set max log file size
- [ ] Set log retention period
- [ ] Test log rotation works

**Monitoring:**
- [ ] Set up PM2 monitoring (optional)
- [ ] Configure alerts for crashes
- [ ] Monitor disk usage
- [ ] Monitor memory usage

---

### TASK-58: Migration from v1 ✅

**Migration Guide:**

1. **Backup v1 state**
   ```bash
   pm2 stop claude-telegram
   cp projects.json projects.json.v1.backup
   cp .env .env.v1.backup
   ```

2. **Update code**
   ```bash
   git pull origin main
   npm install
   ```

3. **Update .env**
   - Add `RESPONSE_IDLE_MS=3000`

4. **Update projects.json**
   - Add `persona` field to each project
   - Use templates from PERSONA_TEMPLATES.md
   - Test JSON syntax: `node -e "require('./projects.json')"`

5. **Test in development**
   ```bash
   node bot.js
   # Send test messages
   # Verify personas load
   # Ctrl+C to stop
   ```

6. **Deploy to production**
   ```bash
   pm2 restart claude-telegram
   pm2 save
   ```

7. **Verify deployment**
   - Check all bots respond
   - Send `/status` to each
   - Verify personas loaded
   - Test basic prompts

**Breaking Changes:**
- Execution model changed from exec to persistent processes
- Persona field is optional but recommended
- Response timing may differ (idle timeout vs completion)

**Rollback Plan:**
If issues occur:
```bash
pm2 stop claude-telegram
git checkout v1  # or previous commit
cp projects.json.v1.backup projects.json
cp .env.v1.backup .env
pm2 restart claude-telegram
```

---

## Test Results Template

Copy this template to track testing progress:

```markdown
# Phase 2 Test Results - [Date]

## Environment
- Node version:
- Claude CLI version:
- OS:
- Number of projects:

## TASK-50: Persistent Process
- [ ] Test 1: Process spawns - PASS/FAIL - Notes:
- [ ] Test 2: Communication - PASS/FAIL - Notes:
- [ ] Test 3: Completion detection - PASS/FAIL - Notes:
- [ ] Test 4: Stays alive - PASS/FAIL - Notes:
- [ ] Test 5: Watchdog - PASS/FAIL - Notes:
- [ ] Test 6: Reset - PASS/FAIL - Notes:

## TASK-51: Persona System
- [ ] Test 1: Injection - PASS/FAIL - Notes:
- [ ] Test 2: /persona - PASS/FAIL - Notes:
- [ ] Test 3: /update-persona - PASS/FAIL - Notes:
- [ ] Test 4: Survives reset - PASS/FAIL - Notes:
- [ ] Test 5: Multiple personas - PASS/FAIL - Notes:

## TASK-52: TASKS.md
- [ ] Test 1: Creation - PASS/FAIL - Notes:
- [ ] Test 2: State transitions - PASS/FAIL - Notes:
- [ ] Test 3: Human flagging - PASS/FAIL - Notes:
- [ ] Test 4: /tasks - PASS/FAIL - Notes:
- [ ] Test 5: /done - PASS/FAIL - Notes:
- [ ] Test 6: AWAITING_HUMAN - PASS/FAIL - Notes:

## TASK-53: Autonomous Loop
- [ ] Test 1: Simple goal - PASS/FAIL - Notes:
- [ ] Test 2: Status updates - PASS/FAIL - Notes:
- [ ] Test 3: Commit gate - PASS/FAIL - Notes:
- [ ] Test 4: Approve/reject - PASS/FAIL - Notes:
- [ ] Test 5: Stop - PASS/FAIL - Notes:
- [ ] Test 6: Completion - PASS/FAIL - Notes:
- [ ] Test 7: With TASKS.md - PASS/FAIL - Notes:

## TASK-54: Planning Mode
- [ ] Test 1: /plan - PASS/FAIL - Notes:
- [ ] Test 2: Choice questions - PASS/FAIL - Notes:
- [ ] Test 3: Text questions - PASS/FAIL - Notes:
- [ ] Test 4: Completion - PASS/FAIL - Notes:
- [ ] Test 5: Confirm - PASS/FAIL - Notes:
- [ ] Test 6: Revision - PASS/FAIL - Notes:

## TASK-55: Integration
- [ ] Test 1: Full workflow - PASS/FAIL - Notes:
- [ ] Test 2: Human tasks - PASS/FAIL - Notes:
- [ ] Test 3: Concurrent bots - PASS/FAIL - Notes:
- [ ] Test 4: State isolation - PASS/FAIL - Notes:
- [ ] Test 5: PM2 restart - PASS/FAIL - Notes:
- [ ] Test 6: Long session - PASS/FAIL - Notes:

## Issues Found
1. [Issue description] - Severity: High/Medium/Low - Status: Open/Fixed
2. ...

## Overall Assessment
- Ready for production: YES/NO
- Blockers:
- Notes:
```

---

## Known Limitations

1. **Response detection may need tuning** - The idle timeout and prompt patterns may not catch all cases
2. **Notification chat ID is simplified** - Uses first authorized user, doesn't track per-user chats
3. **Planning mode questions** - Agent must use exact signal format (PLAN_QUESTION_CHOICE:, etc.)
4. **No multi-user support** - Loop/planning notifications go to whoever started the session
5. **Lost state on restart** - Active loops/planning sessions are lost if PM2 restarts

---

## Reporting Issues

When reporting issues, include:
- Test case that failed
- PM2 logs: `pm2 logs --lines 100`
- Telegram screenshots
- Environment info (Node version, OS, Claude CLI version)
- Steps to reproduce
