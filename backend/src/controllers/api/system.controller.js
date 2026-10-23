const systemService = require('../../services/system.service');
const { ok } = require('../../lib/reply');

async function health(req, res) {
  ok(res, await systemService.getHealth());
}

function hello(req, res) {
  ok(res, systemService.greet(req.params.name));
}

function sum(req, res) {
  ok(res, systemService.sum(req.params.number1, req.params.number2));
}

module.exports = { health, hello, sum };
