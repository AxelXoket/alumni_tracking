const { Router } = require('express');
const swaggerUi = require('swagger-ui-express');
const openapi = require('../../docs/openapi');
const system = require('../../controllers/api/system.controller');
const userRoutes = require('./user.routes');
const announcementRoutes = require('./announcement.routes');
const jobRoutes = require('./job.routes');
const applicationRoutes = require('./application.routes');

/** JSON endpoints. Everything here answers with the { success, data } envelope. */
const router = Router();

router.get('/health', system.health);
router.get('/api/health', system.health);
router.get('/hello/:name', system.hello);
router.get('/sum/:number1/:number2', system.sum);

router.use('/api/users', userRoutes);
router.use('/api/announcements', announcementRoutes);
router.use('/api/jobs', jobRoutes);
router.use('/api/applications', applicationRoutes);

router.get('/api/openapi.json', (req, res) => res.json(openapi));
router.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'Alumni Tracking API' }));

module.exports = router;
