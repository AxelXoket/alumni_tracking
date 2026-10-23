const { Router } = require('express');
const users = require('../../controllers/web/user.controller');

const router = Router();

router.get('/', users.index);
router.post('/', users.create);
router.get('/:id', users.show);
// HTML forms can only send GET/POST, so edit and delete get their own POST routes
router.post('/:id/edit', users.update);
router.post('/:id/delete', users.destroy);

module.exports = router;
