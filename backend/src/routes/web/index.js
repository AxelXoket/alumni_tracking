const { Router } = require('express');
const pages = require('../../controllers/web/page.controller');
const userRoutes = require('./user.routes');
const announcementRoutes = require('./announcement.routes');
const jobRoutes = require('./job.routes');
const applicationRoutes = require('./application.routes');

/** Browser pages rendered with EJS. */
const router = Router();

router.get('/', (req, res) => res.redirect('/home'));
router.get('/home', pages.home);
router.get('/about', pages.about);

router.use('/users', userRoutes);
router.use('/announcements', announcementRoutes);
router.use('/jobs', jobRoutes);
router.use('/applications', applicationRoutes);

module.exports = router;
