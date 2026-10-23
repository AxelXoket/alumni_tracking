const { Router } = require('express');
const apiRoutes = require('./api');
const webRoutes = require('./web');

const router = Router();

router.use(apiRoutes);
router.use(webRoutes);

module.exports = router;
