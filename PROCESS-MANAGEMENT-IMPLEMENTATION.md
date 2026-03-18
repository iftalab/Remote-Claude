# Claude Code Process Management Implementation

## Overview
Implemented process ID tracking and reconnection capabilities for the Claude Agent SDK integration. The system can now track spawned Claude Code processes, save their PIDs, and reconnect to them on service restart.

## Implementation Date
March 18, 2026

## Features Implemented

### 1. Process ID Storage in projects.json
- Added `processId` field to project schema
- Stores the process ID of spawned Claude Code instances
- Set to `null` when no process is active

### 2. Process Spawning with PID Tracking (agent-sdk.js)
- Enhanced `spawn()` method to accept existing process ID for reconnection
- Added `tryReconnect()` method to verify and reconnect to existing processes
- Implemented `isProcessRunning()` to check if a PID is active
- Implemented `isClaudeCodeProcess()` to verify the process is actually Claude Code
- Added `getProcessId()` method to retrieve current tracked PID
- Emits `reconnected` event when successfully reconnected to existing process

### 3. Reconnection Logic on Service Restart (bot.js)
- Reads existing `processId` from projects.json on initialization
- Attempts to reconnect to existing process before spawning new one
- Falls back to spawning new process if reconnection fails
- Automatically saves process ID to config on successful connection
- Clears process ID from config on crash

### 4. API Endpoint for Process Discovery (server.js)
- New endpoint: `GET /api/processes`
- Returns list of all running Claude Code processes on the system
- Includes process ID, command line, and working directory
- Uses `ps` and `lsof` commands to gather process information

### 5. UI Components for Process Management

#### AddProjectDialog.jsx
- Added process ID input field
- "Refresh" button to reload running processes
- Auto-populates dropdown with discovered Claude Code processes
- Click to select from running processes
- Shows PID and working directory for each process

#### Updated API Client (api.js)
- New function: `getRunningProcesses()`
- Fetches running Claude Code processes from server

### 6. Configuration Management (persona.js)
- Added `updateProcessIdInConfig()` function
- Updates process ID in projects.json safely
- Follows same pattern as `updatePersonaInConfig()`

## How It Works

### Normal Flow (New Process)
1. User creates a project without specifying a process ID
2. Bot starts and spawns a new Claude Code instance
3. SDK tracks the process ID internally
4. When ready, process ID is saved to projects.json

### Reconnection Flow (Service Restart)
1. Bot reads projects.json on startup
2. Finds existing `processId` for a project
3. Calls `agent.spawn(persona, existingPid)`
4. Agent verifies process is still running and is Claude Code
5. If valid: connects to existing process, emits `reconnected` event
6. If invalid: spawns new process

### UI Process Selection Flow
1. User opens "Add Project" dialog
2. UI fetches running processes from `/api/processes`
3. Displays list of Claude Code processes with PIDs
4. User can click to select or manually enter PID
5. Process ID is saved with project configuration

## Technical Details

### Process Verification
The system uses two checks to verify a process:
1. **Existence**: `process.kill(pid, 0)` - sends signal 0 to check if process exists
2. **Type**: `ps -p <pid> -o command=` - verifies command contains "claude"

### Process Discovery
Uses system commands to find Claude Code processes:
```bash
ps aux | grep -i claude | grep -v grep
lsof -a -p <pid> -d cwd -Fn
```

## Files Modified

1. `/claude-telegram/projects.json` - Added processId field to all projects
2. `/claude-telegram/agent-sdk.js` - Process tracking and reconnection logic
3. `/claude-telegram/bot.js` - Integration with reconnection on startup
4. `/claude-telegram/persona.js` - Process ID config management
5. `/claude-telegram-ui/server.js` - Process discovery API endpoint
6. `/claude-telegram-ui/src/api.js` - Client API for processes
7. `/claude-telegram-ui/src/components/AddProjectDialog.jsx` - Process selection UI

## Usage

### Via UI
1. Navigate to the UI (http://localhost:3000)
2. Click "Add Project" or edit existing project
3. Click "Refresh" to see running Claude Code processes
4. Select a process from the list or enter PID manually
5. Save project

### Via Configuration File
Edit `projects.json` directly:
```json
{
  "name": "My Project",
  "token": "...",
  "dir": "/path/to/project",
  "processId": 12345
}
```

### On Service Restart
1. Stop service: `pm2 stop ecosystem.config.js`
2. Start service: `pm2 start ecosystem.config.js`
3. Bot will automatically try to reconnect to existing processes

## Benefits

1. **Persistence**: Claude Code processes survive service restarts
2. **Resource Efficiency**: Reuses existing processes instead of spawning new ones
3. **Context Preservation**: Maintains conversation context across restarts
4. **Flexibility**: Manual process selection for advanced use cases
5. **Auto-Discovery**: Automatically finds running Claude Code instances

## Future Enhancements

- Automatic process health monitoring
- Process restart on crash with PID tracking
- Multi-process support per project
- Process metrics and statistics
- Automated cleanup of stale PIDs

## Testing

The implementation has been deployed and is running:
- Bot service: Running (PM2)
- UI service: Running on http://localhost:3000
- Process discovery: Functional
- Reconnection logic: Ready for testing

To test reconnection:
1. Note the current process ID for a project
2. Restart the bot service
3. Check logs for reconnection message
4. Verify bot still works with existing process
