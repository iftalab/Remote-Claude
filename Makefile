.PHONY: start stop restart logs status help setup clean dev bot-only ui-only ui-dev

# Default target
help:
	@echo "📚 Claude-Telegram Bridge - Available Commands"
	@echo ""
	@echo "Main Commands:"
	@echo "  make start     - Start BOTH bot and UI with PM2"
	@echo "  make stop      - Stop both bot and UI"
	@echo "  make restart   - Restart both bot and UI"
	@echo "  make logs      - View combined logs (real-time)"
	@echo "  make status    - Show status of all services"
	@echo "  make setup     - Setup PM2 to start on boot"
	@echo "  make clean     - Stop and remove all services from PM2"
	@echo ""
	@echo "Development Commands:"
	@echo "  make dev       - Run bot in dev mode (no PM2)"
	@echo "  make ui-dev    - Run UI in dev mode (Vite + API server)"
	@echo ""
	@echo "Individual Service Commands:"
	@echo "  make bot-only  - Start only the bot"
	@echo "  make ui-only   - Start only the UI server"
	@echo ""

# Main commands - start both bot and UI
start:
	@echo "🚀 Starting Claude-Telegram Bridge (Bot + UI)..."
	@mkdir -p claude-telegram/logs claude-telegram-ui/logs
	@pm2 start ecosystem.config.js
	@echo ""
	@echo "✅ Services started!"
	@echo "📱 Bot: Running in background"
	@echo "🌐 UI: http://localhost:3000"
	@echo ""
	@echo "💡 Use 'make logs' to view logs"
	@echo "💡 Use 'make status' to check status"

stop:
	@echo "⏸️  Stopping all services..."
	@pm2 stop ecosystem.config.js
	@echo "✅ All services stopped"

restart:
	@echo "🔄 Restarting all services..."
	@pm2 restart ecosystem.config.js
	@echo "✅ All services restarted"

logs:
	@pm2 logs

status:
	@pm2 status

setup:
	@echo "🔧 Setting up PM2 to start on system boot..."
	@pm2 startup
	@pm2 save
	@echo "✅ PM2 startup configured"

clean:
	@echo "🗑️  Removing all services from PM2..."
	@pm2 delete ecosystem.config.js 2>/dev/null || true
	@pm2 save --force
	@echo "✅ All services removed"

# Development mode
dev:
	@echo "🔧 Starting bot in development mode..."
	@cd claude-telegram && node bot.js

ui-dev:
	@echo "🔧 Starting UI in development mode..."
	@echo ""
	@echo "Starting backend API server..."
	@cd claude-telegram-ui && npm run server &
	@sleep 2
	@echo "Starting Vite dev server..."
	@cd claude-telegram-ui && npm run dev

# Individual services
bot-only:
	@echo "🤖 Starting bot only..."
	@pm2 start ecosystem.config.js --only claude-telegram-bot

ui-only:
	@echo "🌐 Starting UI only..."
	@pm2 start ecosystem.config.js --only claude-telegram-ui
