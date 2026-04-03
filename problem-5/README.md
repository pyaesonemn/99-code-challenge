# Items CRUD API

Simple REST API built with Express + TypeScript. Uses SQLite as the database — no external services needed.

## Stack

- Express.js v5
- TypeScript
- SQLite (`better-sqlite3`)
- `tsx` for dev

## Requirements

- Node.js 18+
- npm

## Setup

```bash
npm install
```

## Running

**Dev** (watches for changes):
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

Runs on `http://localhost:3000` by default. Override with:
```bash
PORT=4000 npm run dev
```

The SQLite database is created automatically at `data/database.sqlite` on first run.

## API

Base URL: `/api/items`

---

### POST /api/items

Create an item.

```bash
curl -X POST http://localhost:3000/api/items \
  -H "Content-Type: application/json" \
  -d '{"name": "Laptop", "description": "MacBook Pro 14 inch", "price": 1999.99}'
```

Body:
- `name` — required, non-empty string
- `price` — required, non-negative number
- `description` — optional string

Response `201`:
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

---

### GET /api/items

List items. Supports filtering and sorting via query params.

```bash
curl "http://localhost:3000/api/items?name=lap&min_price=500&max_price=2500&sort=price&order=asc"
```

| Param | Description |
|-------|-------------|
| `name` | Partial match (case-insensitive) |
| `min_price` | Filter by minimum price |
| `max_price` | Filter by maximum price |
| `sort` | `name`, `price`, or `created_at` (default: `created_at`) |
| `order` | `asc` or `desc` (default: `desc`) |

---

### GET /api/items/:id

Get a single item.

```bash
curl http://localhost:3000/api/items/1
```

Returns `404` if not found.

---

### PUT /api/items/:id

Update an item. Partial updates supported — only send what you want to change.

```bash
curl -X PUT http://localhost:3000/api/items/1 \
  -H "Content-Type: application/json" \
  -d '{"price": 1799.99}'
```

`updated_at` is refreshed automatically. At least one field is required.

---

### DELETE /api/items/:id

Delete an item.

```bash
curl -X DELETE http://localhost:3000/api/items/1
```

Returns `204 No Content` on success, `404` if the item doesn't exist.

---

## Testing

Start the server, then in another terminal:

```bash
npm run test:api
```

The smoke test covers create, list, filter, get, update, delete, and a few error cases (404, 400).

To run against a different port:
```bash
./test-api.sh http://localhost:4000
```

## Project structure

```
src/
├── app.ts          # Express setup + error handler
├── server.ts       # Starts the server, handles graceful shutdown
├── database.ts     # SQLite connection + schema
├── routes/
│   └── items.ts    # All CRUD handlers
└── types/
    └── item.ts     # TypeScript interfaces
```

## Notes

- Raw SQL with parameterized queries — no ORM
- Dynamic filters are built safely (values always parameterized, sort field is whitelisted)
- Graceful shutdown on SIGTERM/SIGINT — closes DB before exiting
- DB path can be overridden with `DB_PATH` env variable

## Troubleshooting

**`better-sqlite3` binary error after switching Node versions:**
```bash
npm rebuild better-sqlite3
```

If that doesn't work:
```bash
rm -rf node_modules package-lock.json && npm install
```
