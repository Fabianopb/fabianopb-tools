module.exports = {
  apps: [
    {
      name: 'danik',
      script: 'danik-dist/index.js',
      watch: true,
      autorestart: false,
    },
    {
      name: 'fabiano',
      script: 'fpb-dist/server/index.js',
      watch: true,
      autorestart: false,
    },
    {
      name: 'mongo-backup',
      script: 'tools/backupMongo.js',
      watch: false,
      autorestart: false,
      instances: 1,
      cron_restart: '0,5 3 * * Sunday,Monday',
    },
  ],
};
