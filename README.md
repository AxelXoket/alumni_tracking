# Alumni Tracking System

Course project: a Node.js / Express backend that keeps track of a department's
alumni, students and faculty. It exposes a documented REST API and a few
server-rendered pages, and the whole stack runs with a single Docker Compose
command.

## Contents

- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [Architecture](#architecture)
- [API](#api)
- [Pages](#pages)
- [Testing](#testing)
- [Configuration](#configuration)
- [Weekly progress](#weekly-progress)

## Tech stack

| Area | Choice |
| --- | --- |
| Runtime | Node.js 22 (works on 20+) |
| Web framework | Express 5 |
| Views | EJS templates, plain CSS and JavaScript |
| API docs | OpenAPI 3.0 + Swagger UI |
| Database | PostgreSQL 16 (container) |
| Security | Helmet, CORS |
| Tests | `node:test` + Supertest |
| Containers | Docker, Docker Compose |

## Getting started

### With Docker (recommended)

```bash
docker compose up --build
```

That is the only command needed. Compose starts PostgreSQL, waits until it is
healthy, then builds and starts the API. No `.env` file is required; the
defaults are listed in [`.env.example`](.env.example).

| URL | What it is |
| --- | --- |
| http://localhost:3000/home | Landing page |
| http://localhost:3000/about | About page |
| http://localhost:3000/api/docs | Swagger UI |
| http://localhost:3000/api/health | Health check |
| http://localhost:3000/api/users | Users API |

Stop the stack with `docker compose down` (add `-v` to also delete the database volume).

### Without Docker

```bash
cd backend
npm install
npm run dev        # restarts on file changes
```

Copy `.env.example` to `.env` in the repository root if you want to change any
setting. The users API keeps its data in memory this week, so the database is
optional when running locally; `/api/health` reports `degraded` if it cannot
reach PostgreSQL.

## Project structure

```text
.
├── docker-compose.yml        # db (PostgreSQL 16) + api services
├── .env.example              # every supported setting with its default
└── backend/
    ├── Dockerfile            # two-stage node:22-alpine image, runs as "node"
    ├── package.json
    ├── public/css/main.css   # shared stylesheet (light + dark)
    ├── src/
    │   ├── index.js          # starts the HTTP server, graceful shutdown
    │   ├── app.js            # builds the Express app (middleware, routes)
    │   ├── config/           # environment settings
    │   ├── controllers/      # turn HTTP requests into service calls
    │   ├── db/pool.js        # PostgreSQL connection pool + ping
    │   ├── docs/openapi.js   # OpenAPI 3 document
    │   ├── lib/              # HttpError, response envelope, validator
    │   ├── middleware/       # 404 and error handlers
    │   ├── routes/           # URL → controller mapping
    │   ├── services/         # validation and business rules
    │   ├── store/            # in-memory user storage
    │   └── views/            # EJS templates
    └── tests/                # API tests
```

## Architecture

```text
request ──► routes ──► controller ──► service ──► store
                           │              │
                           │              └─ validation, 404 / 409 rules
                           └─ JSON envelope or rendered view
```

- **Routes** only map URLs to controller functions.
- **Controllers** read params and body, call a service and send the response.
- **Services** validate input and enforce rules (unique email, allowed roles).
- **Store** keeps records in memory and always hands out copies.
- Errors are thrown as `HttpError` and formatted in one place
  (`middleware/error-handler.js`): JSON for API calls, an HTML page for browsers.

## API

All JSON responses share one envelope:

```json
{ "success": true, "data": { } }
{ "success": true, "count": 4, "data": [ ] }
{ "success": false, "error": { "status": 400, "message": "Validation failed", "details": [ { "field": "email", "message": "email is required" } ] } }
```

### System

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health`, `/api/health` | Status, uptime, runtime info and database connectivity |
| GET | `/hello/:name` | Returns a greeting for `name` (max 50 chars) |
| GET | `/sum/:number1/:number2` | Adds two numbers, `400` if either is not a number |

```bash
curl http://localhost:3000/hello/Cagri
# {"success":true,"data":{"name":"Cagri","message":"Hello, Cagri! Welcome to the Alumni Tracking System."}}

curl http://localhost:3000/sum/15/27
# {"success":true,"data":{"operation":"sum","number1":15,"number2":27,"result":42}}
```

### Users (in memory)

The week 3 brief asks for user CRUD **without a database**, so users are kept in
memory and reset whenever the server restarts. Four sample users are loaded at
startup.

| Method | Path | Description | Success | Errors |
| --- | --- | --- | --- | --- |
| GET | `/api/users` | List users, optional `?role=` and `?search=` | 200 | 400 |
| POST | `/api/users` | Create a user | 201 | 400, 409 |
| GET | `/api/users/:id` | Get one user | 200 | 404 |
| PUT | `/api/users/:id` | Replace a user (all required fields) | 200 | 400, 404, 409 |
| PATCH | `/api/users/:id` | Update some fields | 200 | 400, 404, 409 |
| DELETE | `/api/users/:id` | Delete a user | 200 | 404 |

User fields:

| Field | Rules |
| --- | --- |
| `name` | required, 2–100 characters |
| `email` | required, valid email, unique (case-insensitive) |
| `role` | `alumni` (default), `student`, `faculty`, `admin` |
| `department` | optional, up to 120 characters |
| `graduationYear` | optional whole number, 1950–2100 |

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Zeynep Arslan","email":"zeynep@alumni.example.edu","graduationYear":2021}'

curl -X PATCH http://localhost:3000/api/users/<id> \
  -H "Content-Type: application/json" \
  -d '{"role":"faculty"}'

curl -X DELETE http://localhost:3000/api/users/<id>
```

### Swagger

- Swagger UI: http://localhost:3000/api/docs
- Raw OpenAPI document: http://localhost:3000/api/openapi.json

## Pages

| Path | Description |
| --- | --- |
| `/` | Redirects to `/home` |
| `/home` | Landing page with the endpoint list |
| `/about` | Tech stack and request flow |

## Testing

```bash
cd backend
npm test
```

The tests use Node's built-in test runner and Supertest against the Express app
directly, so no server or database has to be running.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `NODE_ENV` | `development` (`production` in Docker) | Runtime mode |
| `PORT` | `3000` | Port the API listens on |
| `HOST` | `0.0.0.0` | Interface to bind |
| `APP_NAME` | `Alumni Tracking System` | Name shown in pages and responses |
| `APP_PORT` | `3000` | Host port published by Compose |
| `DB_HOST` | `localhost` (`db` in Docker) | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `alumni_app` | PostgreSQL user |
| `DB_PASSWORD` | `alumni_app_pw` | PostgreSQL password |
| `DB_NAME` | `alumni_tracking` | Database name |
| `DB_EXTERNAL_PORT` | `5432` | Host port published for PostgreSQL |

## Weekly progress

| Week | Work |
| --- | --- |
| 1–3 | Express setup, health / hello / sum endpoints, home & about pages, Docker Compose, in-memory user CRUD, Swagger docs |
