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
  { method: 'GET', path: '/api/announcements', description: 'List announcements (?category=, ?priority=, ?search=)' },
  { method: 'POST', path: '/api/announcements', description: 'Create an announcement' },
  { method: 'GET', path: '/api/announcements/:id', description: 'Get a single announcement' },
  { method: 'PUT', path: '/api/announcements/:id', description: 'Replace an announcement' },
  { method: 'PATCH', path: '/api/announcements/:id', description: 'Update some announcement fields' },
  { method: 'DELETE', path: '/api/announcements/:id', description: 'Delete an announcement' },
  { method: 'GET', path: '/api/jobs', description: 'List job postings (?userId=, ?workMode=, ?search=)' },
  { method: 'GET', path: '/api/users/:id/jobs', description: 'Jobs posted by a user' },
  { method: 'POST', path: '/api/users/:id/jobs', description: 'Post a job as that user' },
  { method: 'GET', path: '/api/jobs/:id/applications', description: 'Applications of a job' },
  { method: 'POST', path: '/api/jobs/:id/applications', description: 'Apply to a job (409 if already applied)' },
  { method: 'GET', path: '/api/users/:id/applications', description: 'Applications of a user' },
  { method: 'GET', path: '/api/applications', description: 'List applications (?status=)' },
  { method: 'PATCH', path: '/api/applications/:id', description: 'Change an application status' },
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
