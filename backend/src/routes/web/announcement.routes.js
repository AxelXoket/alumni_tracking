const { Router } = require('express');
const announcements = require('../../controllers/web/announcement.controller');

const router = Router();

router.get('/', announcements.index);
router.post('/', announcements.create);
router.get('/:id', announcements.show);
router.post('/:id/edit', announcements.update);
router.post('/:id/delete', announcements.destroy);

module.exports = router;
