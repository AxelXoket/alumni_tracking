const userService = require('../../services/user.service');
const reply = require('../../lib/reply');

/**
 * API controller for users: speaks JSON only (/api/users).
 * The browser pages are served by controllers/web/user.controller.js.
 */

async function index(req, res) {
  reply.list(res, await userService.listUsers(req.query));
}

async function show(req, res) {
  reply.ok(res, await userService.getUser(req.params.id));
}

async function store(req, res) {
  reply.created(res, await userService.createUser(req.body));
}

async function replace(req, res) {
  reply.ok(res, await userService.replaceUser(req.params.id, req.body));
}

async function update(req, res) {
  reply.ok(res, await userService.updateUser(req.params.id, req.body));
}

async function destroy(req, res) {
  const user = await userService.deleteUser(req.params.id);
  reply.ok(res, { id: user.id, deleted: true });
}

module.exports = { index, show, store, replace, update, destroy };
