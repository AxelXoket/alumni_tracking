const { Router } = require('express');
const applications = require('../../controllers/web/application.controller');

const router = Router();

router.get('/', applications.index);
router.post('/', applications.create);
router.post('/:id/status', applications.updateStatus);
router.post('/:id/delete', applications.destroy);

module.exports = router;
