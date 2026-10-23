const userService = require('../services/user.service');
const reply = require('../lib/reply');

function index(req, res) {
  reply.list(res, userService.listUsers(req.query));
}

function show(req, res) {
  reply.success(res, userService.getUser(req.params.id));
}

function store(req, res) {
  reply.created(res, userService.createUser(req.body));
}

function replace(req, res) {
  reply.success(res, userService.replaceUser(req.params.id, req.body));
}

function update(req, res) {
  reply.success(res, userService.updateUser(req.params.id, req.body));
}

function destroy(req, res) {
  const user = userService.deleteUser(req.params.id);
  reply.success(res, { id: user.id, deleted: true });
}

module.exports = { index, show, store, replace, update, destroy };
