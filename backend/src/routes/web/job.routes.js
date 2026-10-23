const { Router } = require('express');
const jobs = require('../../controllers/web/job.controller');

const router = Router();

router.get('/', jobs.index);
router.post('/', jobs.create);
router.get('/:id', jobs.show);
router.post('/:id/apply', jobs.apply);
router.post('/:id/delete', jobs.destroy);

module.exports = router;
