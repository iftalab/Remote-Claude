#!/bin/bash

# Claude-Telegram Bridge - Startup Script

echo "🚀 Starting Claude-Telegram Bridge with PM2..."

# Start with PM2
pm2 start ecosystem.config.js

# Show status
echo ""
echo "📊 Bot Status:"
pm2 status

echo ""
echo "📝 To view logs, run: pm2 logs claude-telegram"
echo "🛑 To stop, run: pm2 stop claude-telegram"
