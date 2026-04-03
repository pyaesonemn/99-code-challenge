import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const dataDirectory = process.env.DB_PATH
  ? path.dirname(process.env.DB_PATH)
  : path.join(process.cwd(), 'data');
const databasePath = process.env.DB_PATH ?? path.join(dataDirectory, 'database.sqlite');

fs.mkdirSync(dataDirectory, { recursive: true });

const db = new Database(databasePath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );
`);

export default db;
