.PHONY: start stop restart logs status help setup clean dev

# Default target
help:
	@echo "📚 Claude-Telegram Bridge - Available Commands"
	@echo ""
	@echo "  make start     - Start the bot with PM2"
	@echo "  make stop      - Stop the bot"
	@echo "  make restart   - Restart the bot"
	@echo "  make logs      - View bot logs (real-time)"
	@echo "  make status    - Show bot status"
	@echo "  make dev       - Run in development mode (no PM2)"
	@echo "  make setup     - Setup PM2 to start on boot"
	@echo "  make clean     - Stop and remove bot from PM2"
	@echo ""

# Start bot with PM2
start:
	@echo "🚀 Starting Claude-Telegram Bridge with PM2..."
	pm2 start ecosystem.config.js
	@echo ""
	pm2 status

# Stop bot
stop:
	@echo "🛑 Stopping bot..."
	pm2 stop claude-telegram

# Restart bot
restart:
	@echo "🔄 Restarting bot..."
	pm2 restart claude-telegram

# View logs
logs:
	@echo "📝 Showing bot logs (Ctrl+C to exit)..."
	pm2 logs claude-telegram

# Show status
status:
	@echo "📊 Bot Status:"
	pm2 status claude-telegram
	@echo ""
	pm2 show claude-telegram

# Run in development mode (direct node, no PM2)
dev:
	@echo "🔧 Running in development mode..."
	node bot.js

# Setup PM2 to start on boot
setup:
	@echo "⚙️  Setting up PM2 to start on system boot..."
	pm2 startup
	@echo ""
	@echo "⚠️  Run the command above (if any), then run: pm2 save"

# Stop and remove from PM2
clean:
	@echo "🧹 Cleaning up..."
	pm2 stop claude-telegram || true
	pm2 delete claude-telegram || true
	@echo "✓ Bot removed from PM2"
