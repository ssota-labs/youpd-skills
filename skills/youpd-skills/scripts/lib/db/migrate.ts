import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import type { Db } from './client.ts';

export const BOOTSTRAP_FILENAME = '000_bootstrap.sql';

/**
 * Default migrations directory. Co-located with the runner module so it stays
 * portable when the plugin is installed into a user's environment.
 */
export const DEFAULT_MIGRATIONS_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'migrations',
);

export interface RunMigrationsOptions {
  /** Override the migrations directory (mostly for tests). */
  migrationsDir?: string;
}

export interface RunMigrationsResult {
  /** All `.sql` files discovered (lex-sorted), regardless of whether applied this run. */
  discovered: string[];
  /** Files newly applied during this call. Does NOT include the bootstrap re-run on already-initialized DBs. */
  appliedMigrations: string[];
  /** Whether the `000_bootstrap.sql` ledger was created in this call (i.e. DB had no `schema_migrations` table before). */
  bootstrapped: boolean;
  /** Total rows in `schema_migrations` after this call. */
  totalLedgerCount: number;
}

interface LedgerRow {
  filename: string;
}

interface SqliteMasterRow {
  name: string;
}

/** Run `fn` inside BEGIN … COMMIT; ROLLBACK on failure. */
function runInTransaction(db: Db, fn: () => void): void {
  db.exec('BEGIN');
  try {
    fn();
    db.exec('COMMIT');
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // ignore rollback errors on an already-aborted transaction
    }
    throw err;
  }
}

/**
 * Apply pending forward-only `.sql` migrations.
 *
 * Algorithm:
 *   1. Detect whether `schema_migrations` exists.
 *   2. Unconditionally `db.exec()` `000_bootstrap.sql` — its body uses
 *      `CREATE TABLE IF NOT EXISTS` + `INSERT OR IGNORE` so it is idempotent.
 *   3. Read the ledger; iterate every `.sql` file in lex order; apply any
 *      file not yet in the ledger inside a single transaction (file body +
 *      ledger insert).
 *
 * If a single file's body fails, the transaction rolls back, the ledger row
 * is not written, and the error propagates so the caller can decide whether
 * to abort or retry. Subsequent files are NOT attempted.
 */
export function runMigrations(
  db: Db,
  options: RunMigrationsOptions = {},
): RunMigrationsResult {
  const migrationsDir = options.migrationsDir ?? DEFAULT_MIGRATIONS_DIR;

  const discovered = readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  if (!discovered.includes(BOOTSTRAP_FILENAME)) {
    throw new Error(
      `Missing bootstrap migration ${BOOTSTRAP_FILENAME} in ${migrationsDir}`,
    );
  }

  const ledgerExisted = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'`)
    .get() as SqliteMasterRow | undefined;

  const bootstrapSql = readFileSync(join(migrationsDir, BOOTSTRAP_FILENAME), 'utf8');
  db.exec(bootstrapSql);

  const bootstrapped = ledgerExisted == null;

  const applied = new Set(
    (db.prepare(`SELECT filename FROM schema_migrations`).all() as unknown as LedgerRow[]).map(
      (row) => row.filename,
    ),
  );

  const insertLedger = db.prepare(`INSERT INTO schema_migrations (filename) VALUES (?)`);

  const appliedMigrations: string[] = [];

  for (const filename of discovered) {
    if (filename === BOOTSTRAP_FILENAME) continue;
    if (applied.has(filename)) continue;

    const sql = readFileSync(join(migrationsDir, filename), 'utf8');

    try {
      runInTransaction(db, () => {
        db.exec(sql);
        insertLedger.run(filename);
      });
    } catch (err) {
      const enriched = new Error(
        `Migration failed: ${filename} — ${(err as Error).message}`,
      );
      (enriched as Error & { cause?: unknown }).cause = err;
      (enriched as Error & { filename?: string }).filename = filename;
      throw enriched;
    }

    appliedMigrations.push(filename);
  }

  if (bootstrapped) {
    appliedMigrations.unshift(BOOTSTRAP_FILENAME);
  }

  const countRow = db.prepare(`SELECT COUNT(*) AS c FROM schema_migrations`).get() as
    | { c: number }
    | undefined;
  const totalLedgerCount = countRow?.c ?? 0;

  return {
    discovered,
    appliedMigrations,
    bootstrapped,
    totalLedgerCount,
  };
}

export interface EnsureWorkspaceMetaOptions {
  schemaVersionLabel: string;
}

export interface EnsureWorkspaceMetaResult {
  workspaceMetaCreated: boolean;
  schemaVersionLabel: string;
  createdAt: string;
}

interface WorkspaceMetaRow {
  id: number;
  created_at: string;
  schema_version_label: string;
}

/**
 * Ensure exactly one row exists in `workspace_meta` (id=1). On a fresh DB,
 * inserts a new row with the given `schemaVersionLabel`. On an existing DB,
 * reads back the previously stored label and returns `created=false`.
 */
export function ensureWorkspaceMeta(
  db: Db,
  options: EnsureWorkspaceMetaOptions,
): EnsureWorkspaceMetaResult {
  const existing = db
    .prepare(`SELECT id, created_at, schema_version_label FROM workspace_meta WHERE id = 1`)
    .get() as WorkspaceMetaRow | undefined;

  if (existing) {
    return {
      workspaceMetaCreated: false,
      schemaVersionLabel: existing.schema_version_label,
      createdAt: existing.created_at,
    };
  }

  const createdAt = new Date().toISOString();
  db.prepare(`INSERT INTO workspace_meta (id, created_at, schema_version_label) VALUES (1, ?, ?)`).run(
    createdAt,
    options.schemaVersionLabel,
  );

  return {
    workspaceMetaCreated: true,
    schemaVersionLabel: options.schemaVersionLabel,
    createdAt,
  };
}
