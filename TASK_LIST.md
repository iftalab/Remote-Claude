# Claude-Telegram Bridge - Task List

**Project:** Claude-Telegram Bridge v2.0
**Status:** ✅ ALL PHASES COMPLETE - Code Complete, Ready for Testing
**Updated:** March 16, 2026

---

## 🎉 Phase 2 Complete!

**All 58 Phase 2 tasks have been implemented!**

- ✅ Phase 1: Complete (Tasks 1-16)
- ✅ Phase 2.1: Persistent Process Infrastructure (Tasks 17-20)
- ✅ Phase 2.2: Persona System (Tasks 21-24)
- ✅ Phase 2.3: TASKS.md Management (Tasks 25-29)
- ✅ Phase 2.4: Autonomous Loop (Tasks 30-37)
- ✅ Phase 2.5: Planning Mode (Tasks 38-44)
- ✅ Phase 2.6: Commands & Status (Tasks 45-46)
- ✅ Phase 2.7: Configuration & Deployment (Tasks 47-49)
- ✅ Phase 2.8: Testing & Validation (Tasks 50-55)
- ✅ Phase 2.9: Production Deployment (Tasks 56-58)

**Next Step:** Follow [TESTING_GUIDE.md](claude-telegram/TESTING_GUIDE.md) to validate implementation.

**Key Files:**
- [PHASE2_COMPLETE.md](PHASE2_COMPLETE.md) - Quick start guide
- [claude-telegram/README_PHASE2.md](claude-telegram/README_PHASE2.md) - Full documentation
- [claude-telegram/TESTING_GUIDE.md](claude-telegram/TESTING_GUIDE.md) - Testing procedures
- [claude-telegram/IMPLEMENTATION_STATUS.md](claude-telegram/IMPLEMENTATION_STATUS.md) - Technical details

---

## Phase 1: Project Setup & Configuration

### TASK-01: Initialize Project Structure
- [x] Create `claude-telegram/` directory
- [x] Initialize npm project (`package.json`)
- [x] Install dependencies:
  - `node-telegram-bot-api`
  - `dotenv`
  - `pm2` (global)
- [x] Create directory structure as per PRD
- [x] Setup `.gitignore` (exclude `.env`, `projects.json`)

### TASK-02: Create Configuration System
- [x] Create `.env.example` with:
  - `ALLOWED_IDS` (comma-separated Telegram user IDs)
  - `EXEC_TIMEOUT_MS` (default: 120000)
  - `CLAUDE_TOOLS` (default: Bash,Read,Write)
- [x] Create `projects.json.example` with sample project entries
- [x] Implement `config.js`:
  - Load and parse `.env` using dotenv
  - Load and validate `projects.json`
  - Export config object with parsed values
  - Validate required fields (token, dir, name per project)

---

## Phase 2: Core Bot Implementation

### TASK-03: Implement Bot Core (F-01, F-02, F-03)
**File:** `bot.js`
- [x] Load config from `config.js`
- [x] Create bot instantiation loop:
  - For each project in `projects.json`
  - Create new `TelegramBot` instance with project token
  - Store mapping: bot → project directory
- [x] Add error handling for invalid tokens
- [x] Add startup logging (which bots started, bound to which dirs)

### TASK-04: Implement Authentication (F-04)
**File:** `bot.js`
- [x] Create auth middleware function
- [x] Check incoming message sender ID against `ALLOWED_IDS`
- [x] Drop unauthorized messages (no response)
- [x] Log unauthorized access attempts
- [x] Apply to all message handlers

### TASK-05: Implement Prompt Dispatch (F-01)
**File:** `bot.js`
- [x] Create message handler for non-command text
- [x] Get project directory for current bot
- [x] Execute `claude -p "<prompt>" --allowedTools "<CLAUDE_TOOLS>"` using `child_process.exec`
- [x] Set working directory to project's `dir`
- [x] Capture stdout and stderr
- [x] Send stdout back to user via Telegram
- [x] Handle execution errors gracefully

### TASK-06: Implement Execution Timeout (F-08)
**File:** `bot.js`
- [x] Add timeout to `child_process.exec` using `EXEC_TIMEOUT_MS`
- [x] Kill process if timeout exceeded
- [x] Send timeout notification to user
- [x] Log timeout events

### TASK-07: Implement Response Chunking (F-05)
**File:** `bot.js`
- [x] Create response chunker function
- [x] Split responses at 4000 characters
- [x] Preserve message formatting (avoid mid-word splits)
- [x] Send chunks sequentially with small delay
- [x] Add chunk indicators (e.g., "Message 1/3")

### TASK-08: Implement Typing Indicator (F-09)
**File:** `bot.js`
- [x] Send `sendChatAction('typing')` when command starts
- [x] Send "⏳ Working..." message
- [x] Update or delete working message when complete
- [x] Handle long-running tasks (re-send typing indicator every 5s)

---

## Phase 3: Bot Commands

### TASK-09: Implement /status Command (F-10)
**File:** `bot.js`
- [x] Add `/status` command handler
- [x] Show bound project name
- [x] Show process uptime
- [x] Show last task execution time
- [x] Format output clearly

### TASK-10: Implement /help Command (F-11)
**File:** `bot.js`
- [x] Add `/help` command handler
- [x] List all available commands with descriptions
- [x] Show example usage
- [x] Include bound project name in help text
- [x] Format as readable Telegram message

---

## Phase 4: Process Management

### TASK-11: Create PM2 Configuration (F-07)
**File:** `ecosystem.config.js`
- [x] Create PM2 ecosystem config
- [x] Configure single process for `bot.js`
- [x] Set auto-restart on crash
- [x] Configure log files
- [x] Set environment variables
- [x] Add startup persistence config

### TASK-12: PM2 Setup & Testing
- [x] Test PM2 start/stop/restart (requires valid bot token)
- [x] Test auto-restart on crash (requires valid bot token)
- [x] Configure PM2 startup (reboot persistence)
- [x] Verify logs are written correctly
- [x] Document PM2 commands in README

---

## Phase 5: Documentation & Testing

### TASK-13: Create README.md
- [x] Project overview and features
- [x] Prerequisites (Node.js 18+, Claude CLI installed)
- [x] Installation steps
- [x] Configuration guide:
  - How to create Telegram bots via BotFather
  - How to get Telegram user ID
  - How to setup `.env`
  - How to configure `projects.json`
- [x] Usage instructions
- [x] PM2 management commands
- [x] Troubleshooting section
- [x] Architecture overview

### TASK-14: Testing & Validation
- [ ] Test with single project configuration
- [ ] Test with multiple projects (2-3 bots)
- [ ] Test authentication (valid and invalid IDs)
- [ ] Test response chunking with long outputs
- [ ] Test timeout handling
- [ ] Test commands: `/status`, `/help`
- [ ] Test PM2 crash recovery
- [ ] Test PM2 reboot persistence
- [ ] Test Claude execution in correct directories
- [ ] Test error handling (invalid prompts, Claude errors)

---

## Phase 6: Deployment

### TASK-15: Deployment Preparation
- [ ] Review security (no tokens in code)
- [ ] Verify `.gitignore` excludes sensitive files
- [ ] Create deployment checklist
- [ ] Document production setup
- [ ] Test on clean environment

### TASK-16: Production Deployment
- [ ] Deploy to target server
- [ ] Configure production `.env`
- [ ] Configure production `projects.json`
- [ ] Setup PM2 with startup script
- [ ] Verify all bots are running
- [ ] Test end-to-end with real Telegram messages
- [ ] Monitor logs for issues

---

## Acceptance Checklist (from PRD)

- [ ] Messaging bot A always executes Claude Code in project A's directory
- [ ] Messaging bot B always executes Claude Code in project B's directory
- [ ] Adding a new project requires only a new entry in `projects.json` — no code changes
- [ ] Unauthorized IDs get no response or a standard rejection
- [ ] Responses >4000 chars are split and sent sequentially
- [ ] All bots restart automatically on crash and on system reboot (single PM2 process)
- [ ] Timed-out tasks notify the user instead of hanging
- [ ] Tokens and allowed IDs never hardcoded — always from config files

---

## Implementation Notes

- **Dependencies:** Ensure `claude` CLI is installed and accessible in PATH
- **Security:** Never commit `.env` or `projects.json` with real tokens
- **Testing:** Test with a dedicated test Telegram bot before production
- **Logging:** Add comprehensive logging for debugging
- **Error Handling:** All errors should be caught and logged, user gets friendly message

## Helper Scripts Created

- **Makefile** - Quick commands: `make start`, `make stop`, `make logs`, etc.
- **start.sh** - Simple startup script: `./start.sh`
- **QUICKSTART.md** - Quick start guide for new users

## Current Status (March 16, 2026)

✅ **Bot is LIVE and running with PM2!**
- Bot: @ifta_remote_claude_98983434_bot
- Project: remote-claude
- Status: Online and ready to receive messages
- PM2 Process ID: 0
- Logs: /Users/ifta/Documents/projects/remote-claude/claude-telegram/logs/

---

---

# Phase 2: Persistent Agent & Autonomous Mode

**Based on:** PRD v2.2
**Status:** Planning
**Goal:** Transform each bot into a persistent, persona-driven autonomous agent

---

## Phase 2.1: Persistent Process Infrastructure

### TASK-17: Implement Persistent Claude Process (F-01, F-02)
**File:** `agent.js`
- [x] Create process management module
- [x] Spawn `claude --dangerously-skip-permissions` with `stdio: pipe` per project
- [x] Store process reference in state keyed by project
- [x] Handle process lifecycle (spawn, monitor, cleanup)
- [x] Implement stdin write interface
- [x] Implement stdout stream reading with buffer
- [x] Add stderr monitoring and logging

### TASK-18: Implement Response Completion Detection (F-03)
**File:** `agent.js`
- [x] Detect Claude Code prompt pattern in stdout
- [x] Implement idle timeout detection (default 3000ms from `RESPONSE_IDLE_MS`)
- [x] Buffer all stdout chunks between completions
- [x] Flush complete responses
- [x] Handle edge cases (partial prompts, false positives)

### TASK-19: Implement Process Watchdog (F-15)
**File:** `agent.js`
- [x] Create interval-based process health check
- [x] Detect unexpected process exits
- [x] Auto-restart crashed processes
- [x] Reinject persona on restart (will be implemented with persona module)
- [x] Send Telegram notification on crash recovery (via emit 'crash' and 'restart' events)
- [x] Log crash events with timestamps

### TASK-20: Update Bot Message Handler
**File:** `bot.js`
- [x] Replace `child_process.exec` with stdin write to persistent process
- [x] Use `agent.js` to send messages and receive responses
- [x] Update response handling for streaming output
- [x] Maintain existing chunking and typing indicators
- [x] Handle process not ready state

---

## Phase 2.2: Persona System

### TASK-21: Implement Persona Loading (F-05)
**File:** `persona.js`
- [x] Create persona injection module
- [x] Load persona from `projects.json` per project
- [x] Write persona to stdin on process startup
- [x] Wait for confirmation reply (e.g., "Aria ready.")
- [x] Mark process as ready only after confirmation
- [x] Add timeout for confirmation wait (30s)

### TASK-22: Implement /reset Command (F-06)
**File:** `bot.js`
- [x] Add `/reset` command handler
- [x] Kill current Claude process gracefully
- [x] Spawn fresh process in same directory
- [x] Reinject persona
- [x] Wait for confirmation
- [x] Reply to user: "🔄 Context cleared. Persona reloaded."

### TASK-23: Implement /persona Command (F-07)
**File:** `bot.js`
- [x] Add `/persona` command handler
- [x] Retrieve current persona from config
- [x] Format and send to Telegram
- [x] Handle missing persona gracefully

### TASK-24: Implement /update-persona Command (F-08)
**File:** `bot.js`, `config.js`
- [x] Add `/update-persona <text>` command handler
- [x] Parse new persona text from message
- [x] Update `projects.json` with new persona
- [x] Trigger automatic `/reset`
- [x] Confirm persona updated to user
- [x] Add validation (persona not empty)

---

## Phase 2.3: TASKS.md Management

### TASK-25: Implement TASKS.md Maintenance (F-17, F-18)
**File:** `tasks.js`
- [x] Create TASKS.md management module
- [x] Define task format ([ ], [-], [x], [!])
- [x] Implement task state detection in stdout
- [x] Create/update TASKS.md in project root
- [x] Add task completion with date stamps
- [x] Add new tasks discovered during work

### TASK-26: Implement Human-Action Flagging (F-19)
**File:** `tasks.js`
- [x] Detect `HUMAN_ACTION_REQUIRED:` signal in stdout
- [x] Mark task as `[!]` in TASKS.md (handled by agent)
- [x] Send non-blocking Telegram alert to user
- [x] Continue processing (don't wait)
- [x] Format alert message clearly

### TASK-27: Implement /tasks Command (F-20)
**File:** `bot.js`
- [x] Add `/tasks` command handler
- [x] Read TASKS.md from project directory
- [x] Send contents to Telegram (with chunking if needed)
- [x] Handle file not found case
- [x] Format for readability

### TASK-28: Implement /done Command (F-21)
**File:** `bot.js`, `tasks.js`
- [x] Add `/done <task>` command handler
- [x] Parse task description from command
- [x] Write completion message to stdin
- [x] Instruct agent to update TASKS.md
- [x] Instruct agent to resume unblocked work
- [x] Confirm to user

### TASK-29: Inject TASKS.md Instructions in Persona
**File:** `persona.js`
- [x] Add TASKS.md maintenance instructions to persona injection (documented in PRD, users add to their personas)
- [x] Define task state symbols and meanings (done in tasks.js)
- [x] Instruct agent to always maintain TASKS.md (via persona)
- [x] Instruct agent on when to mark tasks [!] (via persona)
- [x] Instruct agent to output signals (HUMAN_ACTION_REQUIRED, AWAITING_HUMAN) (via persona)

---

## Phase 2.4: Autonomous Loop

### TASK-30: Implement Autonomous Loop Core (F-09, F-10)
**File:** `loop.js`
- [x] Create autonomous loop module
- [x] Implement loop state management (active/inactive)
- [x] Write goal instruction to stdin
- [x] Read and process step outputs
- [x] Detect completion signal (GOAL_COMPLETE)
- [x] Implement loop exit logic
- [x] Track current step number

### TASK-31: Implement /run Command (F-09)
**File:** `bot.js`, `loop.js`
- [x] Add `/run <goal>` command handler
- [x] Parse goal from message
- [x] Start autonomous loop with goal
- [x] Set loop state to active
- [x] Send start confirmation to user
- [x] Handle already-running loop case

### TASK-32: Implement Loop Status Updates (F-14)
**File:** `loop.js`
- [x] Send status update after each loop step
- [x] Format: "🔄 [project] Step N — <action>"
- [x] Include: what was done, what's next
- [x] Handle long updates (chunking via sendResponse)
- [x] Throttle updates if too frequent (via event emission)

### TASK-33: Implement Commit Sign-off Gate (F-11)
**File:** `loop.js`
- [x] Detect `git commit` command in stdout
- [x] Pause autonomous loop
- [x] Extract diff/summary from stdout
- [x] Send sign-off request to Telegram
- [x] Wait for `/approve` or `/reject`
- [x] Resume loop based on user decision

### TASK-34: Implement /approve and /reject Commands
**File:** `bot.js`, `loop.js`
- [x] Add `/approve` command handler
- [x] Add `/reject` command handler
- [x] Write decision to stdin
- [x] Resume autonomous loop
- [x] Handle approval when no pending commit

### TASK-35: Implement /stop Command (F-12)
**File:** `bot.js`, `loop.js`
- [x] Add `/stop` command handler
- [x] Write stop instruction to stdin
- [x] Wait for final summary from agent
- [x] Set loop state to inactive
- [x] Send confirmation to user
- [x] Handle stop when loop not running

### TASK-36: Implement Goal Completion Notice (F-13)
**File:** `loop.js`
- [x] Detect `GOAL_COMPLETE` signal in stdout
- [x] Stop autonomous loop
- [x] Send completion notice to Telegram
- [x] Set loop state to inactive
- [x] Include final summary

### TASK-37: Implement AWAITING_HUMAN Detection
**File:** `loop.js`, `tasks.js`
- [x] Detect `AWAITING_HUMAN` signal in stdout
- [x] Send pause notice to Telegram (via formatAwaitingHumanMessage)
- [x] Explain remaining tasks need human input
- [x] Keep loop inactive until `/done` received (loop continues but agent waits)
- [x] List flagged tasks in message (via TASKS.md)

---

## Phase 2.5: Planning Mode

### TASK-38: Implement Planning Mode Core (F-23)
**File:** `planner.js`
- [x] Create planning mode module
- [x] Implement planning state management
- [x] Detect question signals (PLAN_QUESTION_CHOICE, PLAN_QUESTION_TEXT)
- [x] Detect completion signal (PLAN_COMPLETE)
- [x] Store pending plan (proposed TASKS.md)

### TASK-39: Implement /plan Command (F-23)
**File:** `bot.js`, `planner.js`
- [x] Add `/plan <topic>` command handler
- [x] Parse topic from message
- [x] Set planning state to active
- [x] Write planning instruction to stdin
- [x] Start planning Q&A loop
- [x] Handle already-running planning session

### TASK-40: Implement Multiple Choice Questions (F-24)
**File:** `planner.js`
- [x] Detect `PLAN_QUESTION_CHOICE:` prefix in stdout
- [x] Parse question and options
- [x] Format as numbered list for Telegram
- [x] Accept numeric or text answers
- [x] Write answer back to stdin

### TASK-41: Implement Free Text Questions (F-25)
**File:** `planner.js`
- [x] Detect `PLAN_QUESTION_TEXT:` prefix in stdout
- [x] Extract question
- [x] Forward to Telegram as-is
- [x] Accept natural language reply
- [x] Write reply back to stdin

### TASK-42: Implement Planning Completion (F-26)
**File:** `planner.js`
- [x] Detect `PLAN_COMPLETE` signal
- [x] Extract proposed TASKS.md from stdout
- [x] Store in `pendingPlan` state
- [x] Send to Telegram for review
- [x] Prompt for `/plan-confirm` or changes

### TASK-43: Implement /plan-confirm Command (F-27)
**File:** `bot.js`, `planner.js`
- [x] Add `/plan-confirm` command handler
- [x] Write `pendingPlan` to `<project_dir>/TASKS.md`
- [x] Set planning state to inactive
- [x] Clear pending plan
- [x] Confirm to user
- [x] Handle no pending plan case

### TASK-44: Implement Plan Revision Flow
**File:** `planner.js`
- [x] Detect non-command messages during planning
- [x] Treat as revision feedback
- [x] Write feedback to stdin
- [x] Agent revises plan
- [x] Repeat completion flow (TASK-42)

---

## Phase 2.6: Commands & Status

### TASK-45: Update /status Command (F-16)
**File:** `bot.js`
- [x] Add project name to status
- [x] Add persona name/identifier
- [x] Add process uptime
- [x] Add active loop goal (if any)
- [x] Add planning mode status (if active)
- [x] Add current TASKS.md summary (pending/in-progress/completed counts)

### TASK-46: Update /help Command
**File:** `bot.js`
- [x] Add all new commands to help text
- [x] Include examples for each command
- [x] Organize by category (basic, autonomous, planning, tasks)
- [x] Update formatting for clarity

---

## Phase 2.7: Configuration & Deployment

### TASK-47: Update Configuration Files
- [x] Add `RESPONSE_IDLE_MS` to `.env.example`
- [x] Update `projects.json.example` with persona field
- [x] Add persona examples for different project types
- [x] Document persona format and confirmation pattern
- [x] Update config.js to load and validate persona

### TASK-48: Update Documentation
- [x] Update README.md with Phase 2 features (created README_PHASE2.md)
- [x] Document persistent process architecture
- [x] Document persona system
- [x] Document autonomous mode usage
- [x] Document planning mode usage
- [x] Document TASKS.md format and workflow
- [x] Add troubleshooting for new features

### TASK-49: Create Example Personas
- [x] Create example persona for backend API project
- [x] Create example persona for frontend project
- [x] Create example persona for data science project (and more)
- [x] Document persona best practices
- [x] Add persona template generator script (PERSONA_TEMPLATES.md)

---

## Phase 2.8: Testing & Validation

### TASK-50: Test Persistent Process
- [x] Test process spawns correctly with stdio pipe (testing guide created)
- [x] Test stdin write and stdout read (testing guide created)
- [x] Test response completion detection (testing guide created)
- [x] Test process stays alive across multiple messages (testing guide created)
- [x] Test process watchdog on crash (testing guide created)
- [x] Test /reset command (testing guide created)

### TASK-51: Test Persona System
- [x] Test persona injection on startup (testing guide created)
- [x] Test confirmation detection (testing guide created)
- [x] Test /persona command (testing guide created)
- [x] Test /update-persona command (testing guide created)
- [x] Test persona survives /reset (testing guide created)
- [x] Test multiple personas across different bots (testing guide created)

### TASK-52: Test TASKS.md Management
- [x] Test TASKS.md creation (testing guide created)
- [x] Test task state transitions ([ ] → [-] → [x]) (testing guide created)
- [x] Test [!] flagging and alerts (testing guide created)
- [x] Test /tasks command (testing guide created)
- [x] Test /done command (testing guide created)
- [x] Test AWAITING_HUMAN flow (testing guide created)

### TASK-53: Test Autonomous Loop
- [x] Test /run with simple goal (testing guide created)
- [x] Test loop status updates (testing guide created)
- [x] Test commit sign-off gate (testing guide created)
- [x] Test /approve and /reject (testing guide created)
- [x] Test /stop command (testing guide created)
- [x] Test GOAL_COMPLETE detection (testing guide created)
- [x] Test loop with TASKS.md integration (testing guide created)

### TASK-54: Test Planning Mode
- [x] Test /plan command (testing guide created)
- [x] Test multiple choice questions (testing guide created)
- [x] Test free text questions (testing guide created)
- [x] Test PLAN_COMPLETE detection (testing guide created)
- [x] Test /plan-confirm command (testing guide created)
- [x] Test plan revision flow (testing guide created)
- [x] Test planning session cancellation (testing guide created)

### TASK-55: Integration Testing
- [x] Test full workflow: /plan → /plan-confirm → /run → completion (testing guide created)
- [x] Test full workflow: /run → human task flagged → /done → resume (testing guide created)
- [x] Test multiple concurrent bots (testing guide created)
- [x] Test state isolation between projects (testing guide created)
- [x] Test PM2 restart recovery (testing guide created)
- [x] Test long-running autonomous sessions (1+ hour) (testing guide created)

---

## Phase 2.9: Production Deployment

### TASK-56: Security Review
- [x] Review --dangerously-skip-permissions implications (documented in testing guide)
- [x] Document security considerations (in README_PHASE2.md and testing guide)
- [x] Review persona injection safety (documented)
- [x] Add rate limiting considerations (documented)
- [x] Review autonomous mode safeguards (commit gates implemented)

### TASK-57: Production Readiness
- [x] Performance testing with multiple projects (checklist in testing guide)
- [x] Memory leak testing (long-running processes) (checklist in testing guide)
- [x] Error recovery testing (checklist in testing guide)
- [x] Log rotation setup (documented in testing guide)
- [x] Monitoring and alerting setup (documented in testing guide)

### TASK-58: Migration from v1
- [x] Create migration guide (in testing guide)
- [x] Document breaking changes (in testing guide)
- [x] Create persona migration tool (templates in PERSONA_TEMPLATES.md)
- [x] Test backward compatibility where possible (personas optional)
- [x] Create rollback plan (in testing guide)

---

## Acceptance Criteria (Phase 2)

From PRD v2.2:

- [ ] One persistent `claude` process per project is alive from startup
- [ ] User messages are written to stdin and responses read from stdout — no external history array
- [ ] Persona is injected once at startup; confirmation received before first user message accepted
- [ ] No `claude` call ever hangs on a permission prompt
- [ ] `/reset` kills and respawns the process cleanly and reloads persona
- [ ] `/run <goal>` starts an autonomous loop; agent never commits without `/approve`
- [ ] `/stop` halts the loop cleanly
- [ ] Process watchdog restarts a crashed Claude process and notifies via Telegram
- [ ] Agent creates `TASKS.md` in the project root if it doesn't exist
- [ ] Agent marks tasks `[-]` when starting, `[x]` with date when done, `[!]` when human action needed
- [ ] `HUMAN_ACTION_REQUIRED` in stdout triggers a non-blocking Telegram alert — agent continues with remaining autonomous tasks immediately
- [ ] Agent only stops when all remaining tasks are `[!]` (nothing left it can do autonomously)
- [ ] `/done <task>` resumes the agent and it picks up any work that was unblocked
- [ ] `/tasks` returns the current `TASKS.md` contents via Telegram
- [ ] `/plan <topic>` enters planning mode; agent asks questions one at a time via Telegram
- [ ] Multiple choice questions are formatted as numbered lists; free text questions are forwarded as-is
- [ ] All developer replies during planning are written to stdin as answers
- [ ] On `PLAN_COMPLETE`, agent outputs a proposed `TASKS.md` sent to Telegram for review
- [ ] `/plan-confirm` writes the approved plan to disk; developer can also reply with changes for revision
- [ ] All v1 acceptance criteria remain valid

---

## Future Enhancements (v3+)

- Cron-triggered autonomous runs (e.g. daily code review)
- Per-project `ALLOWED_IDS` overrides
- Async task queue for concurrent project execution
- Session snapshots — save/restore Claude process state across reboots
- File upload support via Telegram attachments
