const { Router } = require('express');
const swaggerUi = require('swagger-ui-express');
const openapi = require('../docs/openapi');
const system = require('../controllers/system.controller');
const pages = require('../controllers/page.controller');
const userRoutes = require('./user.routes');

const router = Router();

// --- JSON API -------------------------------------------------------------
router.get('/health', system.health);
router.get('/api/health', system.health);
router.get('/hello/:name', system.hello);
router.get('/sum/:number1/:number2', system.sum);
router.use('/api/users', userRoutes);

// --- API documentation ----------------------------------------------------
router.get('/api/openapi.json', (req, res) => res.json(openapi));
router.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'Alumni Tracking API' }));

// --- Pages ----------------------------------------------------------------
router.get('/', (req, res) => res.redirect('/home'));
router.get('/home', pages.home);
router.get('/about', pages.about);

module.exports = router;
