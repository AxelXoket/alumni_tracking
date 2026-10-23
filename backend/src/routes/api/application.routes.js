const { Router } = require('express');
const applications = require('../../controllers/api/application.controller');

const router = Router();

router.get('/', applications.index);
router.post('/', applications.store);
router.get('/:id', applications.show);
router.patch('/:id', applications.update);
router.delete('/:id', applications.destroy);

module.exports = router;
