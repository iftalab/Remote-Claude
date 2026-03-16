# Quick Start Guide

## 🎯 Current Status

**The Claude-Telegram Bridge is fully implemented and ready for testing!**

All core functionality is complete:
- ✅ Multi-bot single process architecture
- ✅ Configuration system with validation
- ✅ Authentication via Telegram user ID whitelist
- ✅ Claude CLI execution with timeout
- ✅ Response chunking for long outputs
- ✅ Bot commands (/help, /status, /start)
- ✅ PM2 process management
- ✅ Comprehensive documentation

## 🚀 Next Steps to Get Running

### 1. Get Your Telegram Bot Tokens

You need to create at least one Telegram bot:

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Follow the prompts to name your bot
4. **Copy the token** (looks like `123456789:ABCdef...`)
5. Repeat if you want multiple project bots

### 2. Get Your Telegram User ID

1. Open Telegram and search for **@userinfobot**
2. Send any message
3. **Copy your user ID** (a number like `123456789`)

### 3. Update Configuration

Edit `.env` and replace the test ID with your real ID:
```env
ALLOWED_IDS=YOUR_REAL_TELEGRAM_ID
```

Edit `projects.json` and add your real bot token(s):
```json
[
  {
    "name": "test-project",
    "token": "YOUR_REAL_BOT_TOKEN_FROM_BOTFATHER",
    "dir": "/Users/ifta/Documents/projects/remote-claude"
  }
]
```

### 4. Test the Bot

**Option A: Direct test**
```bash
npm start
```

**Option B: Production mode with PM2**
```bash
npm run pm2:start
pm2 logs claude-telegram
```

### 5. Send a Test Message

1. Open Telegram
2. Find your bot (search by the username you gave it in BotFather)
3. Send `/start` to begin
4. Send `/help` to see available commands
5. Send any message like: `list files in current directory`

## 📋 Testing Checklist (TASK-14)

Once you have real bot tokens, test these scenarios:

- [ ] `/start` command shows welcome message
- [ ] `/help` command shows usage instructions
- [ ] `/status` command shows bot status
- [ ] Send a simple prompt: `echo "hello world"`
- [ ] Test with multiple projects (if configured)
- [ ] Test unauthorized access (send from different Telegram account)
- [ ] Test long response chunking (ask for a long file listing)
- [ ] Test timeout (ask for a very long-running command)
- [ ] Test PM2 restart: `pm2 restart claude-telegram`
- [ ] Test PM2 auto-restart on crash: `pm2 stop claude-telegram && pm2 start ecosystem.config.js`

## 🛠️ PM2 Commands Reference

```bash
# Start
npm run pm2:start

# View logs in real-time
npm run pm2:logs

# Stop
npm run pm2:stop

# Restart
npm run pm2:restart

# View status
pm2 status

# Setup auto-start on boot
pm2 startup
pm2 save
```

## 🔧 Troubleshooting

**Bot doesn't respond:**
- Check logs: `pm2 logs claude-telegram`
- Verify your Telegram ID is in ALLOWED_IDS
- Verify bot token is correct

**"Unauthorized access" in logs:**
- Your Telegram user ID is not in ALLOWED_IDS
- Get your ID from @userinfobot and add it to .env

**PM2 not found:**
- It's installed locally, use: `npx pm2` or install globally: `npm install -g pm2`

## 📚 Full Documentation

See **README.md** for complete documentation including:
- Architecture overview
- Detailed configuration guide
- Security best practices
- Adding new projects
- Advanced troubleshooting

## 🎉 You're Ready!

Once you've added your real bot token and Telegram user ID, the bot should work perfectly. Message your bot in Telegram to start controlling Claude Code remotely!
