# Alumni Tracking System

Course project: a Node.js / Express backend that keeps track of a department's
alumni, students and faculty. It exposes a documented REST API and a few
server-rendered pages, and the whole stack runs with a single Docker Compose
command.

## Contents

- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [Architecture (MVC)](#architecture-mvc)
- [API](#api)
- [Pages](#pages)
- [Database](#database)
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
| Database | PostgreSQL 16 (container), `pg` driver, SQL migrations |
| Security | Helmet, CORS |
| Tests | `node:test` + Supertest |
| Containers | Docker, Docker Compose |

## Getting started

### With Docker (recommended)

```bash
docker compose up --build
```

That is the only command needed. Compose starts PostgreSQL, waits until it is
healthy, then builds and starts the API. On start the API applies any pending
database migrations and loads the sample data. No `.env` file is required; the
defaults are listed in [`.env.example`](.env.example).

Data is stored in the named volume `pgdata`, so it survives restarts and
rebuilds.

| URL | What it is |
| --- | --- |
| http://localhost:3000/home | Landing page |
| http://localhost:3000/users | User management page |
| http://localhost:3000/announcements | Announcement board |
| http://localhost:3000/about | About page |
| http://localhost:3000/api/docs | Swagger UI |
| http://localhost:3000/api/health | Health check |
| http://localhost:3000/api/users | Users API |

Stop the stack with `docker compose down`. Add `-v` to also delete the database volume.

### Without Docker

```bash
cd backend
npm install
npm run dev        # restarts on file changes
```

The API needs a PostgreSQL database. The easiest option is the one from Compose:

```bash
docker compose up -d db     # PostgreSQL only, published on localhost:5432
cd backend && npm run dev
```

Copy `.env.example` to `.env` in the repository root if you want to change any
setting.

| Script | What it does |
| --- | --- |
| `npm start` | migrate, seed, start the server |
| `npm run dev` | same, restarting on file changes |
| `npm run migrate` | apply pending migrations only |
| `npm run seed` | load the sample data only (idempotent) |
| `npm test` | run the test suite against the test database |

## Project structure

```text
.
├── docker-compose.yml        # db (PostgreSQL 16) + api services, pgdata volume
├── .env.example              # every supported setting with its default
├── ddd.md                    # data design document
└── backend/
    ├── Dockerfile            # two-stage node:22-alpine image, runs as "node"
    ├── package.json
    ├── public/
    │   ├── css/main.css      # shared stylesheet (light + dark)
    │   └── js/app.js         # small progressive-enhancement script
    ├── src/
    │   ├── index.js          # starts the HTTP server, graceful shutdown
    │   ├── app.js            # builds the Express app (middleware, routes)
    │   ├── config/           # environment settings
    │   ├── controllers/
    │   │   ├── api/          # JSON controllers  (/api/...)
    │   │   └── web/          # page controllers  (/users, /home, ...)
    │   ├── db/
    │   │   ├── pool.js       # PostgreSQL connection pool + ping
    │   │   ├── migrate.js    # migration runner (schema_migrations table)
    │   │   ├── seed.js       # loads the seed files
    │   │   ├── migrations/   # 001_create_users_and_announcements.sql, ...
    │   │   └── seeds/        # idempotent sample data
    │   ├── docs/openapi.js   # OpenAPI 3 document
    │   ├── lib/              # HttpError, response envelope, validator, form helpers
    │   ├── middleware/       # 404 and error handlers
    │   ├── models/           # data models (PostgreSQL)
    │   ├── routes/
    │   │   ├── api/          # /api/* and the JSON utility endpoints
    │   │   └── web/          # browser pages
    │   ├── services/         # validation and business rules
    │   └── views/            # EJS templates (partials, users/, ...)
    └── tests/                # API tests
```

## Architecture (MVC)

The app follows Model–View–Controller with an extra service layer. Each
resource has **two controllers**: one that speaks JSON for API clients and one
that renders pages for the browser. Both call the same service, so the rules
live in one place.

```text
                       Browser / API client
                 ┌──────────────┴──────────────┐
          GET /users (HTML)            GET /api/users (JSON)
                 │                             │
     controllers/web/user.controller   controllers/api/user.controller
     renders views/users/*.ejs         sends { success, data }
                 └──────────────┬──────────────┘
                     services/user.service
                 (validation, unique email → 409)
                                │
                      models/user.model (UserModel)
                        PostgreSQL `users` table
```

| Layer | File | Responsibility |
| --- | --- | --- |
| Model | `models/user.model.js` | `UserModel`: `findAll`, `findById`, `findByEmail`, `create`, `update`, `delete`, `count`, `countByRole`. In week 4 it kept records in memory; since week 5 it runs parameterized SQL against the `users` table. The interface stayed the same, so nothing above the model changed. |
| View | `views/users/index.ejs`, `views/users/show.ejs` | User list with stats, search, role filter, create/edit/delete dialogs; detail page. Shared layout in `views/partials`. |
| Controller (API) | `controllers/api/user.controller.js` | `/api/users` CRUD, JSON only. |
| Controller (web) | `controllers/web/user.controller.js` | Renders the pages and handles plain HTML form posts (`POST /users`, `POST /users/:id/edit`, `POST /users/:id/delete`) with redirect-after-post. |
| Service | `services/user.service.js` | Validation, filters, unique-email rule. |
| Model | `models/announcement.model.js` | `AnnouncementModel`, same interface as `UserModel` plus `countByCategory`. |
| View | `views/announcements/index.ejs`, `views/announcements/show.ejs` | Card board with category / priority badges, search and filters, create / edit / delete dialogs; detail page. |
| Controllers | `controllers/api/announcement.controller.js`, `controllers/web/announcement.controller.js` | JSON API at `/api/announcements`, pages and form fallbacks at `/announcements`. |
| Service | `services/announcement.service.js` | Validation of title, content, category, priority and author. |

**How the pages work:** the list is rendered on the server, so it works with
JavaScript turned off — forms post to `/users` and the controller redirects
back with `?status=created` or `?error=...`. When JavaScript is on,
`public/js/app.js` opens the forms in `<dialog>` windows, sends them to the
JSON API instead, filters rows while typing, and reloads the list on success.

Errors are thrown as `HttpError` and formatted in one place
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

### Users

In weeks 3–4 users were kept in memory, as the brief required. Since week 5
they are stored in PostgreSQL. Four sample users are seeded on the first start.

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

### Announcements

A notice board for graduates and students, built with the same MVC pattern as
users: model, service, API controller, web controller and views. Stored in
PostgreSQL since week 5, with four sample announcements seeded.

| Method | Path | Description | Success | Errors |
| --- | --- | --- | --- | --- |
| GET | `/api/announcements` | List, newest first; optional `?category=`, `?priority=`, `?search=` | 200 | 400 |
| POST | `/api/announcements` | Create an announcement | 201 | 400 |
| GET | `/api/announcements/:id` | Get one announcement | 200 | 404 |
| PUT | `/api/announcements/:id` | Replace an announcement | 200 | 400, 404 |
| PATCH | `/api/announcements/:id` | Update some fields | 200 | 400, 404 |
| DELETE | `/api/announcements/:id` | Delete an announcement | 200 | 404 |

| Field | Rules |
| --- | --- |
| `title` | required, 3–150 characters |
| `content` | required, 10–5000 characters |
| `category` | required: `general`, `academic`, `career`, `event` |
| `priority` | `low`, `normal` (default), `high` |
| `author` | required, 2–100 characters (person or office) |

```bash
curl -X POST http://localhost:3000/api/announcements \
  -H "Content-Type: application/json" \
  -d '{"title":"Career fair on 12 March","content":"More than forty companies will join.","category":"career","priority":"high","author":"Career Center"}'

curl "http://localhost:3000/api/announcements?category=event&priority=high"
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
| `/users` | User directory: stats, search, role filter, create / edit / delete |
| `/users/:id` | User detail page |
| `/announcements` | Notice board: stats, search, category / priority filters, create / edit / delete |
| `/announcements/:id` | Announcement detail page |

## Database

PostgreSQL 16 stores all data. The full design (tables, constraints,
indexes, ER diagram, migration and seed strategy) is in the
**[Data Design Document (ddd.md)](ddd.md)**.

Summary:

- `users` and `announcements` tables with UUID keys, `CHECK` constraints for
  the allowed values, a case-insensitive unique index on `email`, and
  `updated_at` triggers.
- Plain SQL migrations in `backend/src/db/migrations`, applied in order and
  recorded in `schema_migrations`. Each file runs in its own transaction.
- Idempotent seed files in `backend/src/db/seeds` (`ON CONFLICT DO NOTHING`).
- Docker named volume `pgdata` for persistence. A `pg_isready` healthcheck
  plus `depends_on: service_healthy` make the API wait for the database.

## Testing

```bash
docker compose up -d db     # the tests need a PostgreSQL server
cd backend
npm test
```

The tests use Node's built-in test runner and Supertest against the Express
app. They run against a **separate database** (`alumni_tracking_test`, created
automatically if the user is allowed to), which is migrated once and then
truncated and re-seeded before each test. Test files run one at a time
because they share that database.

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
| `TEST_DB_NAME` | `alumni_tracking_test` | Database used by `npm test` |
| `SEED_ON_START` | `true` | Load the sample data on every start |

## Weekly progress

| Week | Work |
| --- | --- |
| 1–3 | Express setup, health / hello / sum endpoints, home & about pages, Docker Compose, in-memory user CRUD, Swagger docs |
| 4 (in class) | MVC refactor: `UserModel`, separate API and web controllers, `/users` management page |
| 4 (homework) | Announcements: `AnnouncementModel`, API + web controllers, `/announcements` board |
| 5 | PostgreSQL persistence: models on SQL, migrations, seeds, `pgdata` volume, [ddd.md](ddd.md) |
