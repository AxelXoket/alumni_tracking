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

const ok = (description, schema) => ({ description, ...json(envelope(schema)) });

const listOk = (description, itemSchema) => ({
  description,
  ...json(envelope({ type: 'array', items: itemSchema }, { count: { type: 'integer' } })),
});

const idParam = (description) => ({
  name: 'id',
  in: 'path',
  required: true,
  description,
  schema: { type: 'string', format: 'uuid' },
});

const query = (name, schema, description) => ({ name, in: 'query', schema, description });

/**
 * Builds the standard list/create + get/put/patch/delete paths of a resource.
 * `conflict` adds a 409 response to the write operations.
 */
function crudPaths({ path, tag, noun, schema, inputSchema, patchSchema, filters = [], conflict }) {
  const writeErrors = {
    400: errorResponse('Validation failed'),
    ...(conflict ? { 409: errorResponse(conflict) } : {}),
  };
  const itemErrors = { 404: errorResponse(`${noun} not found`) };

  return {
    [path]: {
      get: {
        tags: [tag],
        summary: `List ${noun.toLowerCase()}s`,
        parameters: filters,
        responses: { 200: listOk(`${noun} list`, ref(schema)), 400: errorResponse('Invalid filter') },
      },
      post: {
        tags: [tag],
        summary: `Create a ${noun.toLowerCase()}`,
        requestBody: { required: true, ...json(ref(inputSchema)) },
        responses: { 201: ok(`${noun} created`, ref(schema)), ...writeErrors },
      },
    },
    [`${path}/{id}`]: {
      parameters: [idParam(`${noun} UUID`)],
      get: {
        tags: [tag],
        summary: `Get a ${noun.toLowerCase()}`,
        responses: { 200: ok(noun, ref(schema)), ...itemErrors },
      },
      put: {
        tags: [tag],
        summary: `Replace a ${noun.toLowerCase()} (all required fields must be sent)`,
        requestBody: { required: true, ...json(ref(inputSchema)) },
        responses: { 200: ok(`Updated ${noun.toLowerCase()}`, ref(schema)), ...writeErrors, ...itemErrors },
      },
      patch: {
        tags: [tag],
        summary: `Update selected ${noun.toLowerCase()} fields`,
        requestBody: { required: true, ...json(ref(patchSchema)) },
        responses: { 200: ok(`Updated ${noun.toLowerCase()}`, ref(schema)), ...writeErrors, ...itemErrors },
      },
      delete: {
        tags: [tag],
        summary: `Delete a ${noun.toLowerCase()}`,
        responses: { 200: ok('Deleted', ref('Deleted')), ...itemErrors },
      },
    },
  };
}

const timestamps = {
  createdAt: { type: 'string', format: 'date-time' },
  updatedAt: { type: 'string', format: 'date-time' },
};

const ROLES = ['alumni', 'student', 'faculty', 'admin'];
const CATEGORIES = ['general', 'academic', 'career', 'event'];
const PRIORITIES = ['low', 'normal', 'high'];

const userFields = {
  name: { type: 'string', minLength: 2, maxLength: 100, example: 'Zeynep Arslan' },
  email: { type: 'string', format: 'email', example: 'zeynep.arslan@alumni.example.edu' },
  role: { type: 'string', enum: ROLES, default: 'alumni' },
  department: { type: 'string', maxLength: 120, nullable: true, example: 'Computer Engineering' },
  graduationYear: { type: 'integer', minimum: 1950, maximum: 2100, nullable: true, example: 2021 },
};

const announcementFields = {
  title: { type: 'string', minLength: 3, maxLength: 150, example: 'Career fair on 12 March' },
  content: { type: 'string', minLength: 10, maxLength: 5000, example: 'More than 40 companies will join the fair in the main hall.' },
  category: { type: 'string', enum: CATEGORIES, example: 'career' },
  priority: { type: 'string', enum: PRIORITIES, default: 'normal' },
  author: { type: 'string', minLength: 2, maxLength: 100, example: 'Career Center' },
};

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Alumni Tracking System API',
    version: '0.4.0',
    description:
      'REST API of the Alumni Tracking System course project. Every response uses the `{ success, data }` envelope; errors use `{ success: false, error }`.',
  },
  servers: [{ url: '/', description: 'Current host' }],
  tags: [
    { name: 'System', description: 'Health check and utility endpoints' },
    { name: 'Users', description: 'User management' },
    { name: 'Announcements', description: 'Notice board for alumni and students' },
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        responses: { 200: ok('Service health', ref('Health')) },
      },
    },
    '/hello/{name}': {
      get: {
        tags: ['System'],
        summary: 'Personal greeting',
        parameters: [{ name: 'name', in: 'path', required: true, schema: { type: 'string', maxLength: 50 } }],
        responses: {
          200: ok('Greeting', { type: 'object', properties: { name: { type: 'string' }, message: { type: 'string' } } }),
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
          200: ok('Sum result', {
            type: 'object',
            properties: {
              operation: { type: 'string', example: 'sum' },
              number1: { type: 'number' },
              number2: { type: 'number' },
              result: { type: 'number', example: 42 },
            },
          }),
          400: errorResponse('One of the operands is not a number'),
        },
      },
    },
    ...crudPaths({
      path: '/api/users',
      tag: 'Users',
      noun: 'User',
      schema: 'User',
      inputSchema: 'UserInput',
      patchSchema: 'UserPatch',
      conflict: 'Email already in use',
      filters: [
        query('role', { type: 'string', enum: ROLES }),
        query('search', { type: 'string' }, 'Matches name or email'),
      ],
    }),
    ...crudPaths({
      path: '/api/announcements',
      tag: 'Announcements',
      noun: 'Announcement',
      schema: 'Announcement',
      inputSchema: 'AnnouncementInput',
      patchSchema: 'AnnouncementPatch',
      filters: [
        query('category', { type: 'string', enum: CATEGORIES }),
        query('priority', { type: 'string', enum: PRIORITIES }),
        query('search', { type: 'string' }, 'Matches title, content or author'),
      ],
    }),
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
          status: { type: 'string', enum: ['ok', 'degraded'] },
          service: { type: 'string' },
          environment: { type: 'string' },
          uptime: { type: 'object', properties: { seconds: { type: 'integer' }, readable: { type: 'string' } } },
          timestamp: { type: 'string', format: 'date-time' },
          runtime: { type: 'object' },
          database: { type: 'object', properties: { connected: { type: 'boolean' } } },
        },
      },
      User: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, ...userFields, ...timestamps } },
      UserInput: { type: 'object', required: ['name', 'email'], properties: userFields },
      UserPatch: { type: 'object', properties: userFields, minProperties: 1 },
      Announcement: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' }, ...announcementFields, ...timestamps },
      },
      AnnouncementInput: {
        type: 'object',
        required: ['title', 'content', 'category', 'author'],
        properties: announcementFields,
      },
      AnnouncementPatch: { type: 'object', properties: announcementFields, minProperties: 1 },
    },
  },
};
