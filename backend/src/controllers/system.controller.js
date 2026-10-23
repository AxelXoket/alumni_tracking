const systemService = require('../services/system.service');
const { success } = require('../lib/reply');

async function health(req, res) {
  success(res, await systemService.getHealth());
}

function hello(req, res) {
  success(res, systemService.greet(req.params.name));
}

function sum(req, res) {
  success(res, systemService.sum(req.params.number1, req.params.number2));
}

module.exports = { health, hello, sum };
