# Scoreboard Module

Backend API spec for the real-time scoreboard system.

## How it works

Users complete actions on the client side. When an action is done, the client sends a `POST /api/scores` request with the action type. The server looks up how many points that action is worth (from a config, not from the client) and updates the user's score. The leaderboard shows the top 10 and updates in real time via SSE.

The important part: **the client never sends a score value**. It only tells the server what action was completed. The server decides the points. This prevents users from manipulating their own scores.

## Architecture

```
Client                        API Server                    PostgreSQL
┌──────────┐                  ┌─────────────────────┐       ┌───────────┐
│          │  POST /scores    │                     │       │           │
│ Complete │─────────────────►│  Validate JWT       │       │  users    │
│  action  │                  │  Check rate limit   │       │           │
│          │◄─────────────────│  Look up points     │──────►│  score    │
│          │  { new_score }   │  Update in txn      │       │  _history │
│          │                  │         │           │       │           │
│          │  SSE stream      │         │           │       └───────────┘
│  Live    │◄─────────────────│  Push top 10        │
│  board   │                  │                     │
└──────────┘                  └─────────────────────┘
```

**Stack:** Node.js + Express, PostgreSQL, SSE for real-time.

No Redis needed for a single server instance. See [Improvements](#improvements) for when to add it.

## Database

### `users`

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(64) UNIQUE NOT NULL,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_leaderboard ON users (score DESC, updated_at ASC);
```

### `score_history`

```sql
CREATE TABLE score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  action_type VARCHAR(64) NOT NULL,
  points INTEGER NOT NULL,
  total_score INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

This table serves double duty — it's the audit log and also the data source for rate limiting (count recent rows per user).

## API

All endpoints require `Authorization: Bearer <JWT>`.

### POST /api/scores

Called when a user completes an action.

**Request:**
```json
{ "action_type": "quiz_complete" }
```

**Response (200):**
```json
{ "points": 10, "new_score": 1250 }
```

**What happens on the server:**
1. Validate JWT, extract user ID.
2. Check rate limit — count this user's rows in `score_history` from the last minute. Reject with `429` if over the limit.
3. Look up points from a server-side config:
   ```
   { "quiz_complete": 10, "daily_login": 5, "challenge_win": 25 }
   ```
4. In a transaction:
   - `UPDATE users SET score = score + $points WHERE id = $user_id`
   - `INSERT INTO score_history (...)`
5. Push updated leaderboard to SSE clients.

**Errors:** `400` unknown action type, `401` bad/missing JWT, `429` rate limited.

### GET /api/leaderboard

Returns the top 10.

```json
{
  "leaderboard": [
    { "rank": 1, "username": "alice", "score": 2500 },
    { "rank": 2, "username": "bob", "score": 2340 }
  ]
}
```

```sql
SELECT username, score FROM users ORDER BY score DESC, updated_at ASC LIMIT 10;
```

### GET /api/leaderboard/stream

SSE endpoint for live updates. Clients connect with `Accept: text/event-stream`.

```
event: update
data: {"leaderboard":[...],"updated_at":"2026-04-02T10:15:32Z"}
```

A heartbeat comment (`: ping`) is sent every 30s to keep the connection alive through proxies.

**Why SSE instead of WebSocket:** The leaderboard only pushes data from server to client — we don't need bidirectional communication. SSE is simpler: it's just HTTP, auth headers work normally, and the browser handles reconnection automatically via `EventSource`.

## Flow of Execution

```
Client                           Server                         Database
  │                                │                                │
  │  1. POST /api/scores           │                                │
  │  { action_type: "quiz" }       │                                │
  │  Authorization: Bearer JWT     │                                │
  │───────────────────────────────►│                                │
  │                                │  2. Validate JWT               │
  │                                │  3. Check rate limit ─────────►│
  │                                │  4. Look up points (config)    │
  │                                │  5. BEGIN                      │
  │                                │     update score ─────────────►│
  │                                │     insert history ───────────►│
  │                                │  6. COMMIT                     │
  │                                │                                │
  │  7. { points: 10,              │                                │
  │       new_score: 1250 }        │                                │
  │◄───────────────────────────────│                                │
  │                                │  8. Query top 10 ─────────────►│
  │                                │  9. Push to SSE clients        │
  │                                │                                │
  │  10. SSE: leaderboard update   │                                │
  │◄───────────────────────────────│                                │
```

## Security

**Authentication:** JWT required on every endpoint. The user ID comes from the token, never from the request body.

**Server-side scoring:** The client sends `action_type`, not points. The server looks up the value. Even if someone intercepts or replays the request, they can only trigger the server's pre-defined point value.

**Rate limiting:** Based on `score_history` row count per user per minute. Prevents spamming.

**Atomic updates:** `UPDATE users SET score = score + $points` is atomic in PostgreSQL — no race conditions.

**Known limitation:** This design doesn't tie each score update to a specific action instance. A user could call the endpoint multiple times for one action before hitting the rate limit. This is a deliberate simplicity tradeoff. For stricter control, see Improvement #3 below.

## Configuration

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `JWT_SECRET` | — | JWT verification secret |
| `RATE_LIMIT_PER_MINUTE` | 10 | Max actions per user per minute |
| `PORT` | 3000 | Server port |

## Project Structure

```
src/
├── controllers/
│   ├── score.controller.ts
│   └── leaderboard.controller.ts
├── services/
│   ├── score.service.ts
│   └── leaderboard.service.ts
├── middleware/
│   ├── auth.middleware.ts
│   └── rate-limit.middleware.ts
├── config/
│   ├── index.ts
│   └── action-scores.ts
├── db/
│   ├── migrations/
│   └── connection.ts
└── app.ts
```

## Improvements

1. **Redis caching** — Cache the leaderboard query result with a short TTL so we're not hitting PostgreSQL on every read.

2. **Redis pub/sub** — Needed when running multiple server instances. Without it, only clients connected to the instance that processed the score update would see the change.

3. **Server-issued action IDs** — Issue a unique ID when an action starts (`POST /api/actions/start`). The client sends this ID back on completion. The server rejects any ID that's already been used. This prevents the duplicate scoring issue mentioned above.

4. **Idempotency keys** — If the network drops after the server processes the request but before the client gets the response, the client retries and might double-count. An `Idempotency-Key` header would let the server replay the cached response.