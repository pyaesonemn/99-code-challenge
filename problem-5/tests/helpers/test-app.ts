import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type Database from 'better-sqlite3';
import type { Express } from 'express';
import { vi } from 'vitest';

export async function createTestApp(): Promise<{
  app: Express;
  db: Database.Database;
  cleanup: () => Promise<void>;
}> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'problem-5-tests-'));
  const databasePath = path.join(tempDir, 'database.sqlite');
  const originalDbPath = process.env.DB_PATH;

  process.env.DB_PATH = databasePath;
  vi.resetModules();

  const [{ default: app }, { default: db }] = await Promise.all([
    import('@/app'),
    import('@/database'),
  ]);

  const cleanup = async () => {
    db.close();

    if (originalDbPath === undefined) {
      delete process.env.DB_PATH;
    } else {
      process.env.DB_PATH = originalDbPath;
    }

    vi.resetModules();
    await fs.rm(tempDir, { recursive: true, force: true });
  };

  return {
    app: app as Express,
    db: db as Database.Database,
    cleanup,
  };
}
