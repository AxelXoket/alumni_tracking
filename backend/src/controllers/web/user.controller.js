const userService = require('../../services/user.service');
const { flashFrom, formAction } = require('../../lib/web');

/**
 * Web controller for users: renders the EJS views under /users and handles
 * the plain HTML form fallbacks. The JSON API lives in controllers/api.
 */

async function index(req, res) {
  const [users, counts] = await Promise.all([userService.listUsers(), userService.getRoleCounts()]);
  res.render('users/index', {
    title: 'Users',
    active: 'users',
    users,
    counts,
    total: users.length,
    roles: userService.ROLES,
    flash: flashFrom(req.query),
    scripts: ['/js/app.js'],
  });
}

async function show(req, res) {
  const user = await userService.getUser(req.params.id);
  res.render('users/show', { title: user.name, active: 'users', user });
}

const create = formAction('/users', (req) => userService.createUser(req.body), 'created');

const update = formAction('/users', (req) => userService.replaceUser(req.params.id, req.body), 'updated');

const destroy = formAction('/users', (req) => userService.deleteUser(req.params.id), 'deleted');

module.exports = { index, show, create, update, destroy };
