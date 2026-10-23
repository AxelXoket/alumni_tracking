/**
 * OpenAPI 3.0 description of the JSON API, served at /api/openapi.json and
 * rendered by Swagger UI at /api/docs. Kept as a plain object so the whole
 * contract lives in one place instead of being scattered across comments.
 */

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });

const envelope = (dataSchema, extra = {}) => ({
  type: 'object',
  properties: { success: { type: 'boolean', example: true }, ...extra, data: dataSchema },
});

const json = (schema) => ({ content: { 'application/json': { schema } } });

const errorResponse = (description) => ({ description, ...json(ref('Error')) });

const idParam = (name = 'id', description = 'Resource UUID') => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'string', format: 'uuid' },
});

const crudResponses = {
  400: errorResponse('Validation failed or malformed id'),
  404: errorResponse('Resource not found'),
};

const userPaths = {
  '/api/users': {
    get: {
      tags: ['Users'],
      summary: 'List users',
      parameters: [
        { name: 'role', in: 'query', schema: { type: 'string', enum: ['alumni', 'student', 'faculty', 'admin'] } },
        { name: 'search', in: 'query', description: 'Matches name or email', schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'User list', ...json(envelope({ type: 'array', items: ref('User') }, { count: { type: 'integer' } })) },
        400: errorResponse('Unknown role filter'),
      },
    },
    post: {
      tags: ['Users'],
      summary: 'Create a user',
      requestBody: { required: true, ...json(ref('UserInput')) },
      responses: {
        201: { description: 'User created', ...json(envelope(ref('User'))) },
        400: errorResponse('Validation failed'),
        409: errorResponse('Email already in use'),
      },
    },
  },
  '/api/users/{id}': {
    parameters: [idParam('id', 'User UUID')],
    get: {
      tags: ['Users'],
      summary: 'Get a user',
      responses: { 200: { description: 'The user', ...json(envelope(ref('User'))) }, ...crudResponses },
    },
    put: {
      tags: ['Users'],
      summary: 'Replace a user (all required fields must be sent)',
      requestBody: { required: true, ...json(ref('UserInput')) },
      responses: {
        200: { description: 'Updated user', ...json(envelope(ref('User'))) },
        ...crudResponses,
        409: errorResponse('Email already in use'),
      },
    },
    patch: {
      tags: ['Users'],
      summary: 'Update selected user fields',
      requestBody: { required: true, ...json(ref('UserPatch')) },
      responses: {
        200: { description: 'Updated user', ...json(envelope(ref('User'))) },
        ...crudResponses,
        409: errorResponse('Email already in use'),
      },
    },
    delete: {
      tags: ['Users'],
      summary: 'Delete a user',
      responses: { 200: { description: 'Deleted', ...json(envelope(ref('Deleted'))) }, ...crudResponses },
    },
  },
};

const userFields = {
  name: { type: 'string', minLength: 2, maxLength: 100, example: 'Zeynep Arslan' },
  email: { type: 'string', format: 'email', example: 'zeynep.arslan@alumni.example.edu' },
  role: { type: 'string', enum: ['alumni', 'student', 'faculty', 'admin'], default: 'alumni' },
  department: { type: 'string', maxLength: 120, nullable: true, example: 'Computer Engineering' },
  graduationYear: { type: 'integer', minimum: 1950, maximum: 2100, nullable: true, example: 2021 },
};

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Alumni Tracking System API',
    version: '0.3.0',
    description: 'REST API of the Alumni Tracking System course project. Every response uses the `{ success, data }` envelope; errors use `{ success: false, error }`.',
  },
  servers: [{ url: '/', description: 'Current host' }],
  tags: [
    { name: 'System', description: 'Health check and utility endpoints' },
    { name: 'Users', description: 'User management' },
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        responses: { 200: { description: 'Service is healthy', ...json(envelope(ref('Health'))) } },
      },
    },
    '/hello/{name}': {
      get: {
        tags: ['System'],
        summary: 'Personal greeting',
        parameters: [{ name: 'name', in: 'path', required: true, schema: { type: 'string', maxLength: 50 } }],
        responses: {
          200: {
            description: 'Greeting',
            ...json(envelope({ type: 'object', properties: { name: { type: 'string' }, message: { type: 'string' } } })),
          },
          400: errorResponse('Name too long'),
        },
      },
    },
    '/sum/{number1}/{number2}': {
      get: {
        tags: ['System'],
        summary: 'Add two numbers',
        parameters: [
          { name: 'number1', in: 'path', required: true, schema: { type: 'number' }, example: 15 },
          { name: 'number2', in: 'path', required: true, schema: { type: 'number' }, example: 27 },
        ],
        responses: {
          200: {
            description: 'Sum result',
            ...json(envelope({
              type: 'object',
              properties: {
                operation: { type: 'string', example: 'sum' },
                number1: { type: 'number' },
                number2: { type: 'number' },
                result: { type: 'number', example: 42 },
              },
            })),
          },
          400: errorResponse('One of the operands is not a number'),
        },
      },
    },
    ...userPaths,
  },
  components: {
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              status: { type: 'integer', example: 400 },
              message: { type: 'string', example: 'Validation failed' },
              details: {
                type: 'array',
                items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } },
              },
            },
          },
        },
      },
      Deleted: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' }, deleted: { type: 'boolean', example: true } },
      },
      Health: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          service: { type: 'string' },
          environment: { type: 'string' },
          uptime: { type: 'object', properties: { seconds: { type: 'integer' }, readable: { type: 'string' } } },
          timestamp: { type: 'string', format: 'date-time' },
          runtime: { type: 'object' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          ...userFields,
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      UserInput: { type: 'object', required: ['name', 'email'], properties: userFields },
      UserPatch: { type: 'object', properties: userFields, minProperties: 1 },
    },
  },
};
