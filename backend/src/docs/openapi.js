/**
 * OpenAPI 3.0 description of the JSON API, served at /api/openapi.json and
 * rendered by Swagger UI at /api/docs. Kept as a plain object so the whole
 * contract lives in one place instead of being scattered across comments.
 */

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });

const json = (schema) => ({ content: { 'application/json': { schema } } });

const errorResponse = (description) => ({ description, ...json(ref('Error')) });

const ok = (description, schema) => ({ description, ...json(schema) });

// list endpoints return a plain JSON array and the size in X-Total-Count
const listOk = (description, itemSchema) => ({
  description,
  headers: { 'X-Total-Count': { description: 'Number of items in the list', schema: { type: 'integer' } } },
  ...json({ type: 'array', items: itemSchema }),
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
function crudPaths({ path, tag, noun, schema, inputSchema, createSchema = inputSchema, patchSchema, filters = [], conflict }) {
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
        requestBody: { required: true, ...json(ref(createSchema)) },
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
const WORK_MODES = ['onsite', 'hybrid', 'remote'];
const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'internship', 'contract'];
const STATUSES = ['applied', 'reviewing', 'interview', 'accepted', 'rejected'];
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

const jobFields = {
  title: { type: 'string', minLength: 2, maxLength: 150, example: 'Junior Backend Developer' },
  company: { type: 'string', minLength: 2, maxLength: 150, example: 'Anatolia Fintech' },
  location: { type: 'string', maxLength: 120, nullable: true, example: 'Istanbul' },
  workMode: { type: 'string', enum: WORK_MODES, default: 'onsite' },
  employmentType: { type: 'string', enum: EMPLOYMENT_TYPES, default: 'full_time' },
  description: { type: 'string', maxLength: 5000, nullable: true },
};

const summary = (props) => ({ type: 'object', properties: props });

const conflictResponse = {
  description: 'The user has already applied for this job posting',
  ...json(ref('AlreadyApplied')),
};

const userIdParam = idParam('User UUID');

const nestedPaths = {
  '/api/users/{id}/jobs': {
    parameters: [userIdParam],
    get: {
      tags: ['Jobs'],
      summary: 'Jobs posted by a user (one-to-many)',
      responses: { 200: listOk('Job list', ref('JobPosting')), 404: errorResponse('User not found') },
    },
    post: {
      tags: ['Jobs'],
      summary: 'Post a job as this user',
      description: 'The poster is always the user in the URL. A `userId` in the body is ignored.',
      requestBody: { required: true, ...json(ref('JobInput')) },
      responses: {
        201: ok('Job created', ref('JobPosting')),
        400: errorResponse('Validation failed'),
        404: errorResponse('User not found'),
      },
    },
  },
  '/api/users/{id}/applications': {
    parameters: [userIdParam],
    get: {
      tags: ['Applications'],
      summary: 'Applications sent by a user',
      responses: { 200: listOk('Application list', ref('Application')), 404: errorResponse('User not found') },
    },
  },
  '/api/jobs/{id}/applications': {
    parameters: [idParam('Job posting UUID')],
    get: {
      tags: ['Applications'],
      summary: 'Applications received by a job posting',
      responses: { 200: listOk('Application list', ref('Application')), 404: errorResponse('Job posting not found') },
    },
    post: {
      tags: ['Applications'],
      summary: 'Apply to this job (many-to-many)',
      requestBody: { required: true, ...json(ref('ApplyInput')) },
      responses: {
        201: ok('Application created', ref('Application')),
        400: errorResponse('Validation failed'),
        404: errorResponse('User or job posting not found'),
        409: conflictResponse,
      },
    },
  },
  '/api/applications': {
    get: {
      tags: ['Applications'],
      summary: 'List applications',
      parameters: [query('status', { type: 'string', enum: STATUSES })],
      responses: { 200: listOk('Application list', ref('Application')), 400: errorResponse('Invalid filter') },
    },
    post: {
      tags: ['Applications'],
      summary: 'Create an application (job named in the body)',
      requestBody: { required: true, ...json(ref('ApplicationInput')) },
      responses: {
        201: ok('Application created', ref('Application')),
        400: errorResponse('Validation failed'),
        404: errorResponse('User or job posting not found'),
        409: conflictResponse,
      },
    },
  },
  '/api/applications/{id}': {
    parameters: [idParam('Application UUID')],
    get: {
      tags: ['Applications'],
      summary: 'Get an application',
      responses: { 200: ok('Application', ref('Application')), 404: errorResponse('Application not found') },
    },
    patch: {
      tags: ['Applications'],
      summary: 'Change the status of an application',
      requestBody: { required: true, ...json(ref('StatusInput')) },
      responses: {
        200: ok('Updated application', ref('Application')),
        400: errorResponse('Invalid status'),
        404: errorResponse('Application not found'),
      },
    },
    delete: {
      tags: ['Applications'],
      summary: 'Withdraw (delete) an application',
      responses: { 200: ok('Deleted', ref('Deleted')), 404: errorResponse('Application not found') },
    },
  },
};

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Alumni Tracking System API',
    version: '0.6.0',
    description:
      'REST API of the Alumni Tracking System course project. List endpoints return plain JSON arrays (size in the `X-Total-Count` header) and single resources return plain objects. Errors use `{ error, message, details? }`.',
  },
  servers: [{ url: '/', description: 'Current host' }],
  tags: [
    { name: 'System', description: 'Health check and utility endpoints' },
    { name: 'Users', description: 'User management' },
    { name: 'Announcements', description: 'Notice board for alumni and students' },
    { name: 'Jobs', description: 'Job postings (users 1 ──< N job_postings)' },
    { name: 'Applications', description: 'Applications (users N >──< M job_postings)' },
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
    ...crudPaths({
      path: '/api/jobs',
      tag: 'Jobs',
      noun: 'Job posting',
      schema: 'JobPosting',
      inputSchema: 'JobInput',
      createSchema: 'JobCreateInput',
      patchSchema: 'JobPatch',
      filters: [
        query('userId', { type: 'string', format: 'uuid' }, 'Only jobs posted by this user'),
        query('workMode', { type: 'string', enum: WORK_MODES }),
        query('search', { type: 'string' }, 'Matches title, company or location'),
      ],
    }),
    ...nestedPaths,
  },
  components: {
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Bad Request', description: 'HTTP reason phrase' },
          message: { type: 'string', example: 'Validation failed' },
          details: {
            type: 'array',
            items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } },
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
      JobPosting: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          ...jobFields,
          applicationCount: { type: 'integer' },
          postedBy: summary({ id: { type: 'string', format: 'uuid' }, name: { type: 'string' }, email: { type: 'string' } }),
          ...timestamps,
        },
      },
      JobInput: { type: 'object', required: ['title', 'company'], properties: jobFields },
      JobCreateInput: {
        type: 'object',
        required: ['userId', 'title', 'company'],
        properties: { userId: { type: 'string', format: 'uuid', description: 'Poster' }, ...jobFields },
      },
      JobPatch: { type: 'object', properties: jobFields, minProperties: 1 },
      Application: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          jobPostingId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: STATUSES },
          coverLetter: { type: 'string', nullable: true },
          candidate: summary({ id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' } }),
          job: summary({ id: { type: 'string' }, title: { type: 'string' }, company: { type: 'string' } }),
          ...timestamps,
        },
      },
      ApplyInput: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', format: 'uuid', description: 'Candidate' },
          status: { type: 'string', enum: STATUSES, default: 'applied' },
          coverLetter: { type: 'string', maxLength: 2000 },
        },
      },
      ApplicationInput: {
        type: 'object',
        required: ['userId', 'jobPostingId'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          jobPostingId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: STATUSES, default: 'applied' },
          coverLetter: { type: 'string', maxLength: 2000 },
        },
      },
      StatusInput: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: STATUSES } } },
      AlreadyApplied: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Conflict' },
          message: { type: 'string', example: 'User has already applied for this job posting' },
        },
      },
    },
  },
};
