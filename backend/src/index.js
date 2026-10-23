const config = require('./config');
const createApp = require('./app');
const db = require('./db/pool');

const app = createApp();

const server = app.listen(config.port, config.host, () => {
  console.log(`${config.appName} listening on http://${config.host}:${config.port} (${config.env})`);
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);
  server.close(async () => {
    await db.close();
    process.exit(0);
  });
  // force exit if open connections keep the server alive for too long
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
