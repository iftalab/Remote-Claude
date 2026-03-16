# Claude-Telegram Bridge - Web UI

A minimal local web interface for managing Claude-Telegram Bridge projects, personas, and viewing task/conversation history.

## Overview

This UI runs locally on your machine and provides a clean interface for:
- Managing projects (add, edit, delete)
- Writing and editing personas
- Viewing task lists (TASKS.md)
- Reading conversation history

**Not included:** Bot control (start/stop, `/run`, `/approve` etc.) — those stay in Telegram.

## Prerequisites

- Node.js 18+
- The Claude-Telegram Bridge bot running in `../claude-telegram/`

## Installation

```bash
cd claude-telegram-ui
npm install
```

## Development

Run the Vite dev server (hot reload):
```bash
npm run dev
```

In a separate terminal, run the API server:
```bash
npm run server
```

The UI will be available at `http://localhost:5173` and API at `http://localhost:3000`.

## Production

Build and start:
```bash
npm start
```

This builds the React app and serves it with the Express server at `http://localhost:3000`.

## Project Structure

```
claude-telegram-ui/
├── server.js              # Express API server (file bridge)
├── src/
│   ├── pages/            # React pages (ProjectsList, ProjectDetail)
│   ├── components/       # React components
│   ├── utils/            # Utility functions (task parser, etc.)
│   ├── App.jsx           # Main app component
│   └── main.jsx          # Entry point
├── vite.config.js        # Vite configuration
└── tailwind.config.js    # Tailwind CSS configuration
```

## API Endpoints

The Express server provides a minimal file bridge API:

- `GET /api/projects` - Read projects.json
- `PUT /api/projects` - Write projects.json
- `GET /api/projects/:name/tasks` - Read TASKS.md for a project
- `GET /api/projects/:name/history` - Read conversation log for a project

**Security:** Server binds to `localhost` only — never exposed externally.

## Tech Stack

- **Frontend:** React 19 + Vite + Tailwind CSS
- **Routing:** React Router v7
- **Backend:** Express 5 (minimal file bridge only)
- **State:** No database — reads/writes `projects.json` and project files directly

## Development Status

**Phase 3.1: Project Setup** ✅ Complete
- Vite + React initialized
- Tailwind CSS configured
- Express server created
- Directory structure set up

**Next:** Implement React components and API client (Tasks 61-85)

## License

MIT
