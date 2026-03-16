module.exports = {
  apps: [
    {
      name: 'claude-telegram-bot',
      script: 'bot.js',
      cwd: '/Users/ifta/Documents/projects/remote-claude/claude-telegram',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/bot-error.log',
      out_file: './logs/bot-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 10000,
      kill_timeout: 5000,
      wait_ready: false
    },
    {
      name: 'claude-telegram-ui',
      script: 'server.js',
      cwd: '/Users/ifta/Documents/projects/remote-claude/claude-telegram-ui',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/ui-error.log',
      out_file: './logs/ui-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '5s',
      listen_timeout: 5000,
      kill_timeout: 3000,
      wait_ready: false
    }
  ]
};
