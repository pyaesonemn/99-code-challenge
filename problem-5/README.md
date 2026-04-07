# Items CRUD API

Small REST API built with Express.js, TypeScript, and SQLite. The project is intentionally simple, but it still includes a few practical touches that make it feel like a thoughtful backend instead of a bare template: input validation, safe dynamic filtering, pagination, targeted indexes, consistent JSON error responses, and a lightweight model/service/controller structure.

## Stack

- Express.js
- TypeScript
- SQLite via `better-sqlite3`
- Zod for request validation
- `tsx` for local development

## Requirements

- Node.js 18+
- npm

## Setup

```bash
npm install
```

## Running the app

Development mode:

```bash
npm run dev
```

Production build:

```bash
npm run build
npm start
```

The API runs on `http://localhost:3000` by default.

To change the port:

```bash
PORT=4000 npm run dev
```

The SQLite database is created automatically at `data/database.sqlite` the first time the app starts.

## Test commands

Run all automated tests:

```bash
npm test
```

Run only unit tests:

```bash
npm run test:unit
```

Run only integration tests:

```bash
npm run test:integration
```

Run Vitest in watch mode:

```bash
npm run test:watch
```

## API overview

Base path:

```text
/api/items
```

### POST /api/items

Create a new item.

```bash
curl -X POST http://localhost:3000/api/items \
  -H "Content-Type: application/json" \
  -d '{"name":"Laptop","description":"MacBook Pro 14 inch","price":1999.99}'
```

Validation rules:

- `name` is required and must be a non-empty string
- `price` is required and must be a non-negative number
- `description` is optional

Request validation is handled through Zod middleware before the controller runs.

Example response:

```json
{
  "id": 1,
  "name": "Laptop",
  "description": "MacBook Pro 14 inch",
  "price": 1999.99,
  "created_at": "2026-04-03T10:08:49Z",
  "updated_at": "2026-04-03T10:08:49Z"
}
```

### GET /api/items

List items with filtering, sorting, and pagination.

```bash
curl "http://localhost:3000/api/items?name=lap&min_price=500&max_price=2500&sort=price&order=asc&page=1&limit=5"
```

Supported query params:

| Param | Description |
| --- | --- |
| `name` | Partial name match, case-insensitive |
| `min_price` | Minimum price |
| `max_price` | Maximum price |
| `sort` | `name`, `price`, or `created_at` |
| `order` | `asc` or `desc` |
| `page` | Page number, default `1` |
| `limit` | Items per page, default `10`, max `100` |

Example response:

```json
{
  "items": [
    {
      "id": 1,
      "name": "Laptop",
      "description": "MacBook Pro 14 inch",
      "price": 1999.99,
      "created_at": "2026-04-03T10:08:49Z",
      "updated_at": "2026-04-03T10:08:49Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

Pagination metadata is calculated from the same filters used for the list query, so the counts always match the filtered result set.

### GET /api/items/:id

Get a single item by ID.

```bash
curl http://localhost:3000/api/items/1
```

Returns `404` if the item does not exist.

### PUT /api/items/:id

Update an existing item. Partial updates are supported, so only send the fields you want to change.

```bash
curl -X PUT http://localhost:3000/api/items/1 \
  -H "Content-Type: application/json" \
  -d '{"price":1799.99}'
```

`updated_at` is refreshed automatically. The request must include at least one valid field.

### DELETE /api/items/:id

Delete an item.

```bash
curl -X DELETE http://localhost:3000/api/items/1
```

Returns `204 No Content` on success and `404` if the item is missing.

## Testing

Start the server, then run the smoke test in a second terminal:

```bash
npm run test:api
```

Vitest is the main automated test suite for this project:

- unit tests cover Zod schemas and service logic
- integration tests hit the real Express app with a temporary SQLite test database
- `test-api.sh` stays as a simple manual smoke/demo script

The smoke test covers:

- create
- default paginated list response
- filtered + paginated list response
- custom `page` / `limit`
- get by ID
- update
- delete
- validation errors
- JSON `404` for unknown routes

To run the smoke test against a different port:

```bash
./test-api.sh http://localhost:4000
```

## Project structure

```text
src/
├── app.ts
├── server.ts
├── database.ts
├── controllers/
│   └── items.controller.ts
├── services/
│   └── items.service.ts
├── models/
│   └── items.model.ts
├── middlewares/
│   ├── not-found.ts
│   └── validate.ts
├── routes/
│   └── items.ts
├── schemas/
│   └── items.schema.ts
└── types/
    └── item.ts

tests/
├── helpers/
│   └── test-app.ts
├── integration/
│   └── items.api.test.ts
└── unit/
    ├── items.schema.test.ts
    └── items.service.test.ts
```

## Implementation notes

- Uses raw SQL with parameterized queries instead of an ORM
- Dynamic filtering is kept safe by parameterizing values and whitelisting sortable columns
- Uses a small function-based model/service/controller split to separate routing, business logic, and SQL without adding class-heavy ceremony
- Uses Zod middleware to validate request body, params, and query data before controllers execute
- Uses a minimal Vitest + Supertest setup to cover both architecture-level logic and end-to-end API behavior without building a large test framework
- Adds indexes on `created_at` and `price` because those are the fields that match the current query patterns
- Does not add an index on `name` because the current `LIKE '%term%'` search would not benefit much from a standard B-tree index
- Returns JSON for both application errors and unknown routes
- Supports `DB_PATH` to override the default SQLite file location

## Troubleshooting

If `better-sqlite3` breaks after switching Node versions:

```bash
npm rebuild better-sqlite3
```

If that still does not fix it:

```bash
rm -rf node_modules package-lock.json
npm install
```
