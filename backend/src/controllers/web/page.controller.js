const config = require('../../config');

const ENDPOINTS = [
  { method: 'GET', path: '/api/health', description: 'Service health and uptime' },
  { method: 'GET', path: '/hello/:name', description: 'Personal greeting', example: '/hello/Cagri' },
  { method: 'GET', path: '/sum/:number1/:number2', description: 'Adds two numbers', example: '/sum/15/27' },
  { method: 'GET', path: '/api/users', description: 'List users (?role=, ?search=)' },
  { method: 'POST', path: '/api/users', description: 'Create a user' },
  { method: 'GET', path: '/api/users/:id', description: 'Get a single user' },
  { method: 'PUT', path: '/api/users/:id', description: 'Replace a user' },
  { method: 'PATCH', path: '/api/users/:id', description: 'Update some user fields' },
  { method: 'DELETE', path: '/api/users/:id', description: 'Delete a user' },
  { method: 'GET', path: '/api/docs', description: 'Swagger UI', example: '/api/docs' },
];

function home(req, res) {
  res.render('home', { title: 'Home', active: 'home', endpoints: ENDPOINTS });
}

function about(req, res) {
  res.render('about', {
    title: 'About',
    active: 'about',
    appName: config.appName,
    environment: config.env,
    nodeVersion: process.version,
  });
}

module.exports = { home, about };
