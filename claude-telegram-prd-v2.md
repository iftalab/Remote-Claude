# Claude-Telegram Bridge — PRD Phase 2

**Version:** 2.2  
**Status:** Ready for Development  
**Previous Version:** 2.1  
**Date:** March 2026

---

## What's New in Phase 2

Phase 1 built the basic bridge. Phase 2 turns each project bot into a **persistent, persona-driven autonomous agent** you control from Telegram. Three core problems are solved:

1. **No more lost context** — one long-lived `claude` process per project stays open; context is native to the process, zero token overhead
2. **No more permission hangs** — all Claude Code execution runs with `--dangerously-skip-permissions`
3. **Autonomous agent mode** — each bot loads a project persona on startup and can run a goal-driven autonomous loop, reporting back and asking for sign-off before committing
4. **TASKS.md as the project's source of truth** — agent maintains a live task list per project, marks tasks done as it works, and flags any task requiring human action before proceeding
5. **Interactive planning mode** — agent can ask the developer questions (multiple choice or free text) via Telegram to gather requirements, then produces a `TASKS.md` as the output of the planning session

---

## Goals

- Keep one persistent `claude` process per project alive indefinitely; pipe commands in via stdin
- Context is managed natively by Claude Code — no history arrays, no token duplication
- Never hang on permission prompts — all execution is fully non-interactive
- Each bot loads a persona from `projects.json` on startup and injects it once at process start
- Persona can be updated by restarting the process via `/reset`
- Agent can enter an autonomous loop toward a defined goal, triggered by a Telegram command
- Agent messages you with a summary and asks for sign-off before any git commit
- Autonomous loop stops when goal is achieved or you send `/stop`
- Agent maintains a `TASKS.md` in each project root, updating it after every completed task
- Tasks requiring human action are flagged in `TASKS.md` and via Telegram; agent skips them and continues
- Agent can enter a planning mode, ask structured questions via Telegram, and produce `TASKS.md` as output

## Non-Goals (v2)

- No in-memory history arrays — context lives entirely inside the Claude process
- No file/image upload support
- No web UI
- No fully unsupervised commits (sign-off always required)

---

## Features

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F-01 | Persistent Claude Process | One `claude` process per project, spawned with `stdio: pipe`, kept alive for the session | Must Have |
| F-02 | stdin Command Injection | User messages written to the process stdin; responses read from stdout | Must Have |
| F-03 | Response Completion Detection | Detect when Claude has finished responding and is waiting for next input via stdout idle/prompt pattern | Must Have |
| F-04 | Non-Interactive Execution | Process spawned with `--dangerously-skip-permissions`; no prompts ever | Must Have |
| F-05 | Persona Injection at Startup | Persona written to stdin once when process starts, before any user message | Must Have |
| F-06 | `/reset` Command | Kills the current Claude process, spawns a fresh one, reinjects persona | Must Have |
| F-07 | `/persona` Command | Displays the current loaded persona for that bot | Should Have |
| F-08 | `/update-persona <text>` Command | Updates persona in `projects.json`, triggers a `/reset` to reload | Must Have |
| F-09 | `/run <goal>` Command | Triggers autonomous agent loop with a defined goal; agent works until goal is achieved | Must Have |
| F-10 | Autonomous Loop | Agent iteratively runs tasks via stdin, self-reviews stdout, decides next step until goal is met | Must Have |
| F-11 | Commit Sign-off Gate | Before any `git commit`, agent sends diff summary to Telegram and waits for `/approve` or `/reject` | Must Have |
| F-12 | `/stop` Command | Halts the autonomous loop at the end of the current step | Must Have |
| F-13 | Goal Completion Notice | Agent sends a Telegram message when it determines the goal has been achieved | Must Have |
| F-14 | Loop Status Updates | Agent sends a brief Telegram update after each step in the autonomous loop | Should Have |
| F-15 | Process Watchdog | If the Claude process dies unexpectedly, restart it and reinject persona automatically | Must Have |
| F-16 | `/status` Command | Shows project name, persona name, process uptime, active loop goal if any | Should Have |
| F-17 | TASKS.md Maintenance | Agent creates and maintains a `TASKS.md` in the project root; updates it after each completed task | Must Have |
| F-18 | Task Completion Marking | When a task is done, agent marks it `[x]` in `TASKS.md` and adds a short completion note | Must Have |
| F-19 | Human-Action Flag | Agent marks task `[!]` in `TASKS.md`, sends non-blocking Telegram alert, moves on to next autonomous task | Must Have |
| F-20 | `/tasks` Command | Sends current `TASKS.md` contents to Telegram | Must Have |
| F-21 | `/done <task>` Command | Signals the agent a human task is complete; agent marks it `[x]` and resumes unblocked work | Must Have |
| F-22 | Task Addition | Agent adds new tasks to `TASKS.md` as it discovers them during autonomous work | Should Have |
| F-23 | `/plan <topic>` Command | Triggers interactive planning mode; agent asks questions to gather requirements | Must Have |
| F-24 | Planning Questions — Multiple Choice | Agent outputs structured multiple choice questions; bot renders options as a numbered list for easy reply | Must Have |
| F-25 | Planning Questions — Free Text | Agent asks open-ended questions; user replies in natural language; agent continues | Must Have |
| F-26 | Planning Completion | When agent has enough information, it writes a full `TASKS.md` and sends it to Telegram for review | Must Have |
| F-27 | `/plan-confirm` Command | User approves the generated `TASKS.md`; agent saves it to disk and is ready to `/run` | Must Have |

---

## Commands

| Command | Description | Example |
|---------|-------------|---------|
| `<any text>` | Injected into the live Claude process stdin | `Why is the auth module broken?` |
| `/reset` | Kill process, spawn fresh, reinject persona | `/reset` |
| `/persona` | Show current loaded persona | `/persona` |
| `/update-persona <text>` | Update persona in config and reset | `/update-persona You are a senior Rails engineer...` |
| `/run <goal>` | Start autonomous loop toward a goal | `/run Refactor the payment module to use Stripe v3` |
| `/approve` | Approve pending commit and let agent proceed | `/approve` |
| `/reject` | Reject pending commit, agent skips and continues | `/reject` |
| `/stop` | Halt the autonomous loop | `/stop` |
| `/tasks` | Show current TASKS.md contents | `/tasks` |
| `/done <task>` | Mark a flagged human task complete, agent picks up anything unblocked | `/done SSL certificate` |
| `/plan <topic>` | Start interactive planning session for a topic | `/plan redesign the auth flow` |
| `/plan-confirm` | Approve generated TASKS.md and save it to disk | `/plan-confirm` |
| `/status` | Show project, persona, process state, loop goal | `/status` |
| `/help` | List all commands | `/help` |

---

## Persona Spec

The persona is a plain text block stored in `projects.json` per project. It is written to the Claude process stdin **once at startup**, before any user message, establishing the agent's identity and north star for the entire session.

It defines:
- Who the agent is (role, expertise, tone)
- The north star of the project (goal, stack, constraints)
- Standing instructions (e.g. "always write tests", "never modify the DB schema directly")

Because it is injected into the live process rather than prepended to every call, it costs tokens only once per session.

**Example persona:**
```
You are Aria, a senior backend engineer and the autonomous maintainer of the "my-api" project.

North star: Keep this API fast, well-tested, and production-stable at all times.

Stack: Node.js, Postgres, deployed on Railway.
Rules:
- Always write tests for new functions
- Never modify migration files that have already run
- Prefer explicit error handling over silent failures
- When in doubt, ask via Telegram before acting

Confirm you have loaded this context by replying: "Aria ready."
```

The final line asks Claude to confirm — the bot waits for this confirmation before marking the process as ready to accept user messages.

---

## Configuration

**`.env`** — shared settings
```
ALLOWED_IDS=123456789,987654321
RESPONSE_IDLE_MS=3000
CLAUDE_TOOLS=Bash,Read,Write
```

**`projects.json`** — one entry per project/bot
```json
[
  {
    "name": "my-api",
    "token": "111111111:AAF_bot_token_for_my_api",
    "dir": "/home/user/projects/my-api",
    "persona": "You are Aria, a senior backend engineer and autonomous maintainer of my-api.\n\nNorth star: Keep this API fast, well-tested, and production-stable.\n\nStack: Node.js, Postgres, Railway.\nRules:\n- Always write tests\n- Never modify ran migrations\n- Ask via Telegram before irreversible actions\n\nConfirm by replying: \"Aria ready.\""
  },
  {
    "name": "frontend",
    "token": "222222222:AAF_bot_token_for_frontend",
    "dir": "/home/user/projects/frontend",
    "persona": "You are Max, a frontend engineer owning the React dashboard.\n\nNorth star: Pixel-perfect, accessible, fast UI.\n\nStack: React, Tailwind, Vite.\nRules:\n- No inline styles\n- All components must be responsive\n- Write Storybook stories for new components\n\nConfirm by replying: \"Max ready.\""
  }
]
```

---

## Technical Architecture

### Persistent Process Model

Each project bot spawns exactly one `claude` process on startup and keeps it alive for the entire session. Commands are written to stdin; responses are read from stdout.

```javascript
const proc = spawn('claude', ['--dangerously-skip-permissions'], {
  cwd: project.dir,
  stdio: ['pipe', 'pipe', 'pipe']
});

// Inject persona once at startup
proc.stdin.write(project.persona + '\n');

// Send a user message
proc.stdin.write(userMessage + '\n');

// Stream response back
proc.stdout.on('data', (chunk) => {
  buffer += chunk.toString();
});
```

### Response Completion Detection

Claude Code streams output continuously while working. The bot must know when it has finished before forwarding to Telegram or sending the next autonomous step. Detection strategy:

- **Primary:** Watch for Claude's input prompt pattern in stdout (e.g. a line ending with `>` or the known Claude Code prompt string)
- **Fallback:** If no new stdout bytes arrive within `RESPONSE_IDLE_MS` (default 3000ms), treat as complete
- Buffer all stdout chunks between completions; flush the full buffer to Telegram as one response (chunked if >4000 chars)

### Process Watchdog

A simple interval checks whether the process is still alive. If it has exited unexpectedly, the watchdog spawns a new one and reinjects the persona automatically, then notifies via Telegram:

```
⚠️ [my-api] Claude process restarted. Persona reloaded. Context from before the crash is lost.
```

### Autonomous Loop

When `/run <goal>` is received:

1. Write goal to stdin: `"Your goal: <goal>. Work autonomously step by step. After each step summarise what you did and what you will do next. When the goal is fully achieved, say GOAL_COMPLETE."`
2. Read stdout after each step
3. If output contains a `git commit` command: pause, extract diff, send sign-off request to Telegram, wait for `/approve` or `/reject`, then write the decision back to stdin
4. Watch for `GOAL_COMPLETE` in stdout — send completion notice and exit loop
5. `/stop` writes `"Stop what you are doing. Summarise progress so far."` to stdin, then exits loop after response

### Planning Mode

Triggered by `/plan <topic>`. The agent enters a back-and-forth Q&A with the developer to gather everything it needs to produce a solid `TASKS.md`. No code is written during planning — it is purely a requirements-gathering and task-breakdown session.

**Question types:**

*Multiple choice* — agent outputs a structured block the bot detects and renders as a numbered list:
```
PLAN_QUESTION_CHOICE: Which authentication strategy should we use?
1. JWT tokens
2. Session-based auth
3. OAuth2 (Google/GitHub)
4. Magic link email
```
Bot sends this to Telegram as-is. Developer replies with the number(s) or the text.

*Free text* — agent outputs a plain question:
```
PLAN_QUESTION_TEXT: What is the expected number of concurrent users at launch?
```
Bot forwards to Telegram. Developer replies in natural language; reply is written back to stdin.

**Planning flow:**
1. `/plan <topic>` received → bot writes `"Enter planning mode for: <topic>. Ask me questions one at a time to understand requirements. Use PLAN_QUESTION_CHOICE: or PLAN_QUESTION_TEXT: format. When you have enough information, produce a complete TASKS.md and output PLAN_COMPLETE."` to stdin
2. Agent asks questions; bot detects signal prefix and formats accordingly for Telegram
3. Developer replies; bot writes answer back to stdin
4. Repeat until agent outputs `PLAN_COMPLETE` followed by the full `TASKS.md` content
5. Bot sends the proposed `TASKS.md` to Telegram with a prompt to reply `/plan-confirm` or suggest changes
6. On `/plan-confirm`: bot writes the file to disk at `<project_dir>/TASKS.md`
7. If developer replies with changes instead: bot writes feedback to stdin, agent revises and outputs updated plan

**Planning state:**
```javascript
state[chatId] = {
  ...
  planningActive: true,
  pendingPlan: null  // holds proposed TASKS.md content awaiting confirmation
}
```

During an active planning session, all user messages (that aren't `/plan-confirm`) are treated as answers to the agent's questions and written directly to stdin.

`TASKS.md` lives in the project root and is the agent's persistent task ledger. It is created on first use if it doesn't exist. The agent is instructed via persona to treat it as the canonical source of truth for what needs doing.

**Format:**
```markdown
# TASKS.md — my-api

## In Progress
- [ ] Refactor PaymentService to use Stripe v3

## Pending
- [ ] Add rate limiting to /api/auth endpoints
- [!] Set up production SSL certificate — ⚠️ WAITING FOR HUMAN
- [ ] Write integration tests for checkout flow

## Completed
- [x] Extract charge logic into PaymentService (2026-03-16)
- [x] Update route handlers to use new service (2026-03-16)
```

**Task states:**
| Symbol | Meaning |
|--------|---------|
| `[ ]` | Pending — not yet started |
| `[-]` | In progress — agent is currently working on this |
| `[x]` | Done — completed, with date |
| `[!]` | Blocked — requires human action before agent can continue |

**Agent instructions (injected as part of persona):**
```
You must maintain TASKS.md in the project root at all times.
- When you start a task, mark it [-]
- When you finish a task, mark it [x] with today's date and a one-line note
- When you discover new tasks, add them under Pending
- If a task requires human action (e.g. credentials, physical access, external approvals),
  mark it [!] and output HUMAN_ACTION_REQUIRED: <description>, then immediately move on to the next task
- Only stop working when there are no remaining tasks you can do autonomously
```

**Human-action flow:**
1. Agent encounters a task it cannot complete autonomously
2. Marks it `[!]` in `TASKS.md`
3. Outputs `HUMAN_ACTION_REQUIRED: <description>` to stdout
4. Bot detects this signal, sends a non-blocking Telegram alert and continues reading stdout:
   ```
   🚨 [my-api] Human task flagged — continuing with other tasks:
   
   Set up production SSL certificate on the VPS.
   
   Reply /done <task> when complete.
   ```
5. Agent immediately moves on to the next available task — no pause, no waiting
6. If the agent finishes all autonomous tasks and only `[!]` tasks remain, it outputs `AWAITING_HUMAN` and the bot sends:
   ```
   ⏸️ [my-api] All remaining tasks need your input. Reply /done <task> as you complete each one.
   ```
7. On `/done <task>`: bot writes `"The human task '<task>' is complete. Check TASKS.md and continue any work that was unblocked."` to stdin

**Loop update message format:**
```
🔄 [my-api] Step 3 — Refactoring payment module
✅ Extracted charge logic into PaymentService
📋 Next: Update route handlers to use new service
```

**Commit sign-off message format:**
```
📝 [my-api] Ready to commit:

  refactor: extract PaymentService from routes

  Changed files:
  - src/services/PaymentService.js (new)
  - src/routes/payments.js (modified)
  - tests/PaymentService.test.js (new)

  [diff summary]

Reply /approve to commit or /reject to skip.
```

---

## Directory Structure

```
claude-telegram/
  ├── bot.js                # Main process — spins up one bot per project
  ├── agent.js              # Persistent Claude process management + stdin/stdout bridge
  ├── loop.js               # Autonomous loop logic
  ├── planner.js            # Planning mode — Q&A flow and TASKS.md generation
  ├── persona.js            # Persona loading and startup injection
  ├── tasks.js              # TASKS.md signal detection and Telegram alerts
  ├── config.js             # Loads env + projects.json
  ├── projects.json         # Per-project: name, token, dir, persona
  ├── ecosystem.config.js   # PM2 config
  ├── .env                  # Shared settings
  └── README.md
```

---

## Core Flow

### Startup (per project bot)
1. Read project config from `projects.json`
2. Spawn `claude --dangerously-skip-permissions` in project dir with `stdio: pipe`
3. Write persona to stdin
4. Wait for confirmation reply in stdout
5. Mark process as ready; begin accepting Telegram messages

### Normal message
1. Message received → auth check
2. Write message to Claude process stdin
3. Collect stdout until response completion detected
4. Chunk + send response to Telegram

### `/reset`
1. Kill current Claude process
2. Spawn fresh process in same project dir
3. Reinject persona
4. Wait for confirmation
5. Reply: "🔄 Context cleared. Persona reloaded."

### `/plan <topic>` (planning mode)
1. Set `planningActive = true`
2. Write planning instruction to stdin with topic
3. Loop: read stdout → detect `PLAN_QUESTION_CHOICE` or `PLAN_QUESTION_TEXT` signal → format and send to Telegram
4. Developer reply → write answer to stdin → agent asks next question
5. On `PLAN_COMPLETE`: extract proposed `TASKS.md` from stdout, store in `pendingPlan`, send to Telegram
6. On `/plan-confirm`: write `pendingPlan` to `<project_dir>/TASKS.md`, set `planningActive = false`, confirm to user
7. If developer replies with changes: write feedback to stdin, agent revises, repeat from step 5

### `/run <goal>` (autonomous loop)
1. Set `loopActive = true`
2. Write goal instruction to stdin
3. Loop: read step output → send update to Telegram → check for `GOAL_COMPLETE`, commit gate, or `HUMAN_ACTION_REQUIRED`
4. On commit gate: pause, send sign-off, wait for `/approve` or `/reject`, write decision to stdin
5. On `HUMAN_ACTION_REQUIRED`: mark task `[!]` in TASKS.md, send Telegram alert, pause until `/done`
6. On `GOAL_COMPLETE`: notify user, set `loopActive = false`
7. On `/stop`: write stop instruction to stdin, send final summary, set `loopActive = false`

### `/tasks`
1. Read `TASKS.md` from project dir
2. Send contents to Telegram (chunked if needed)
3. If file doesn't exist: reply "No TASKS.md found yet."

### `/done <task>`
1. Write `"The human task '<task>' is complete. Check TASKS.md for anything that was unblocked and continue."` to Claude process stdin
2. Agent updates `TASKS.md` — marks that `[!]` task `[x]`, resumes any work it can now do

---

## Acceptance Criteria

- One persistent `claude` process per project is alive from startup
- User messages are written to stdin and responses read from stdout — no external history array
- Persona is injected once at startup; confirmation received before first user message accepted
- No `claude` call ever hangs on a permission prompt
- `/reset` kills and respawns the process cleanly and reloads persona
- `/run <goal>` starts an autonomous loop; agent never commits without `/approve`
- `/stop` halts the loop cleanly
- Process watchdog restarts a crashed Claude process and notifies via Telegram
- Agent creates `TASKS.md` in the project root if it doesn't exist
- Agent marks tasks `[-]` when starting, `[x]` with date when done, `[!]` when human action needed
- `HUMAN_ACTION_REQUIRED` in stdout triggers a non-blocking Telegram alert — agent continues with remaining autonomous tasks immediately
- Agent only stops when all remaining tasks are `[!]` (nothing left it can do autonomously)
- `/done <task>` resumes the agent and it picks up any work that was unblocked
- `/tasks` returns the current `TASKS.md` contents via Telegram
- `/plan <topic>` enters planning mode; agent asks questions one at a time via Telegram
- Multiple choice questions are formatted as numbered lists; free text questions are forwarded as-is
- All developer replies during planning are written to stdin as answers
- On `PLAN_COMPLETE`, agent outputs a proposed `TASKS.md` sent to Telegram for review
- `/plan-confirm` writes the approved plan to disk; developer can also reply with changes for revision
- All v1.1 acceptance criteria remain valid

---

## Out of Scope (v2)

- File/image upload support
- Fully unsupervised commits
- Multi-user access controls
- Scheduled/cron-based autonomous triggers
- Web dashboard

## Future (v3+)

- Cron-triggered autonomous runs (e.g. daily code review)
- Per-project `ALLOWED_IDS` overrides
- Async task queue for concurrent project execution
- Session snapshots — save/restore Claude process state across reboots
- File upload support via Telegram attachments
