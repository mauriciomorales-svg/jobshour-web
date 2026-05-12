/** @type {import('pm2').StartOptions} */
module.exports = {
  apps: [
    {
      name: 'jobshour-web',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/jobshour-web',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/jobshour-web-error.log',
      out_file: '/var/log/pm2/jobshour-web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      // Reinicio gracioso: espera a que Next.js esté listo antes de matar el proceso anterior
      wait_ready: true,
      listen_timeout: 15000,
      kill_timeout: 5000,
    },
  ],
}
