const { Router } = require('express');
const jobs = require('../../controllers/api/job.controller');

const router = Router();

router.get('/', jobs.index);
router.post('/', jobs.store);
router.get('/:id', jobs.show);
router.put('/:id', jobs.replace);
router.patch('/:id', jobs.update);
router.delete('/:id', jobs.destroy);

// nested: applications of one job
router.get('/:id/applications', jobs.applications);
router.post('/:id/applications', jobs.apply);

module.exports = router;
