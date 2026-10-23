const { Router } = require('express');
const users = require('../../controllers/api/user.controller');
const jobs = require('../../controllers/api/job.controller');
const applications = require('../../controllers/api/application.controller');

const router = Router();

router.get('/', users.index);
router.post('/', users.store);
router.get('/:id', users.show);
router.put('/:id', users.replace);
router.patch('/:id', users.update);
router.delete('/:id', users.destroy);

// nested: jobs posted by a user (1:N) and applications sent by a user (N:M)
router.get('/:id/jobs', jobs.indexForUser);
router.post('/:id/jobs', jobs.storeForUser);
router.get('/:id/applications', applications.indexForUser);

module.exports = router;
