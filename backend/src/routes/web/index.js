const { Router } = require('express');
const pages = require('../../controllers/web/page.controller');
const userRoutes = require('./user.routes');
const announcementRoutes = require('./announcement.routes');

/** Browser pages rendered with EJS. */
const router = Router();

router.get('/', (req, res) => res.redirect('/home'));
router.get('/home', pages.home);
router.get('/about', pages.about);

router.use('/users', userRoutes);
router.use('/announcements', announcementRoutes);

module.exports = router;
