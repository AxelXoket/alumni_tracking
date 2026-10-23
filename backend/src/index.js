const config = require('./config');
const createApp = require('./app');
const db = require('./db/pool');
const { migrate } = require('./db/migrate');
const { seed } = require('./db/seed');

let server = null;

async function start() {
  // bring the schema up to date and load the sample data before accepting traffic
  await migrate();
  if (config.seedOnStart) await seed();

  server = createApp().listen(config.port, config.host, () => {
    console.log(`${config.appName} listening on http://${config.host}:${config.port} (${config.env})`);
  });
}

function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);
  // force exit if open connections keep the server alive for too long
  setTimeout(() => process.exit(1), 10000).unref();
  const closeServer = server ? new Promise((resolve) => server.close(resolve)) : Promise.resolve();
  closeServer.then(() => db.close()).then(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch(async (err) => {
  console.error(`Startup failed: ${err.message}`);
  await db.close().catch(() => {});
  process.exit(1);
});
