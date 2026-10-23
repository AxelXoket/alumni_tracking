const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');
const routes = require('./routes');
const notFound = require('./middleware/not-found');
const errorHandler = require('./middleware/error-handler');

function createApp() {
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          // Swagger UI ships an inline style block; everything else is external
          'style-src': ["'self'", "'unsafe-inline'"],
          // the app is served over plain HTTP on localhost, so do not force HTTPS
          'upgrade-insecure-requests': null,
        },
      },
    }),
  );
  app.use(cors());
  if (!config.isTest) app.use(morgan(config.isProduction ? 'combined' : 'dev'));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: config.isProduction ? '1h' : 0 }));

  app.locals.appName = config.appName;

  app.use(routes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
