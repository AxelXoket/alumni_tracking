const { Router } = require('express');
const announcements = require('../../controllers/api/announcement.controller');

const router = Router();

router.get('/', announcements.index);
router.post('/', announcements.store);
router.get('/:id', announcements.show);
router.put('/:id', announcements.replace);
router.patch('/:id', announcements.update);
router.delete('/:id', announcements.destroy);

module.exports = router;
