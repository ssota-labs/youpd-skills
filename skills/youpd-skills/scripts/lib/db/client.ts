import { DatabaseSync, type DatabaseSync as DatabaseSyncType } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';

export type Db = DatabaseSyncType;

export interface OpenDbOptions {
  /** Override DB file path. If relative, resolved against `process.cwd()`. */
  path?: string;
  /** Default `false`. When true, opens read-only (skips WAL PRAGMA). */
  readonly?: boolean;
  /** Skip auto-creating parent directory. Defaults to false (we create). */
  skipMkdir?: boolean;
}

export const DEFAULT_DB_FILENAME = 'workspace.db';
export const DEFAULT_DB_RELATIVE_DIR = '.youpd';

/**
 * Resolve the DB path with the following precedence:
 *   1. explicit `options.path`
 *   2. `process.env.YOUPD_WORKSPACE_DB`
 *   3. `<cwd>/.youpd/workspace.db`
 */
export function resolveDbPath(options: OpenDbOptions = {}): string {
  const raw =
    options.path ??
    process.env.YOUPD_WORKSPACE_DB ??
    `${DEFAULT_DB_RELATIVE_DIR}/${DEFAULT_DB_FILENAME}`;
  return isAbsolute(raw) ? raw : resolve(process.cwd(), raw);
}

export interface OpenDbResult {
  db: Db;
  dbPath: string;
  /** True when the parent directory was created in this call. */
  parentDirCreated: boolean;
}

/**
 * Open (or create) the workspace SQLite database file with the project's
 * standard settings.
 *
 * Uses Node.js built-in `node:sqlite` (DatabaseSync). Requires Node 22.5+;
 * this project pins Node 24.
 *
 * - `journal_mode = WAL` for safer concurrent reads alongside writes.
 * - `enableForeignKeyConstraints = true` so FK constraints are enforced.
 * - `timeout = 5000` ms busy timeout for WAL contention retries.
 *
 * The caller is responsible for calling `db.close()` when finished.
 */
export function openDb(options: OpenDbOptions = {}): OpenDbResult {
  const dbPath = resolveDbPath(options);

  let parentDirCreated = false;
  if (!options.skipMkdir) {
    const parent = dirname(dbPath);
    try {
      mkdirSync(parent, { recursive: true });
      parentDirCreated = true;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'EEXIST') throw err;
    }
  }

  const db = new DatabaseSync(dbPath, {
    readOnly: options.readonly === true,
    timeout: 5000,
    enableForeignKeyConstraints: true,
  });

  if (!options.readonly) {
    db.exec('PRAGMA journal_mode = WAL');
  }

  return { db, dbPath, parentDirCreated };
}
