const { Router } = require('express');
const users = require('../controllers/user.controller');

const router = Router();

router.get('/', users.index);
router.post('/', users.store);
router.get('/:id', users.show);
router.put('/:id', users.replace);
router.patch('/:id', users.update);
router.delete('/:id', users.destroy);

module.exports = router;
