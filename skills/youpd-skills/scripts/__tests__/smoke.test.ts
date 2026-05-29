/**
 * P1.0 smoke tests. Validates the migration runner + workspace_meta lifecycle
 * end-to-end against a real (temp file) SQLite DB.
 *
 * Run via: pnpm test:smoke
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

import { openDb } from '../lib/db/client.ts';
import {
  ensureWorkspaceMeta,
  runMigrations,
  DEFAULT_MIGRATIONS_DIR,
} from '../lib/db/migrate.ts';

const TEST_FILE_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_FILE_DIR, '..', '..', '..', '..');
const INIT_SCRIPT = resolve(TEST_FILE_DIR, '..', 'workspace', 'init.ts');

interface TempWorkspace {
  dir: string;
  dbPath: string;
}

function makeTempWorkspace(): TempWorkspace {
  const dir = mkdtempSync(join(tmpdir(), 'youpd-skills-smoke-'));
  return { dir, dbPath: join(dir, 'workspace.db') };
}

function cleanup(ws: TempWorkspace): void {
  try {
    rmSync(ws.dir, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
}

function expectedMigrationFilenames(): string[] {
  return readdirSync(DEFAULT_MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

function tableExists(db: ReturnType<typeof openDb>['db'], name: string): boolean {
  const row = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`)
    .get(name) as { name: string } | undefined;
  return row != null;
}

test('runMigrations: applies all migrations on a fresh DB and reports them', () => {
  const ws = makeTempWorkspace();
  try {
    const { db } = openDb({ path: ws.dbPath });
    const result = runMigrations(db);

    const expected = expectedMigrationFilenames();
    assert.deepEqual(result.discovered, expected);
    assert.equal(result.bootstrapped, true);
    assert.deepEqual(
      result.appliedMigrations,
      expected,
      'Every discovered migration must be reported as applied on a fresh DB',
    );
    assert.equal(result.totalLedgerCount, expected.length);

    // P1.0 + P1.1 + P1.2 migrations
    assert.ok(tableExists(db, 'schema_migrations'));
    assert.ok(tableExists(db, 'workspace_meta'));
    assert.ok(tableExists(db, 'youtube_keywords'));
    assert.ok(tableExists(db, 'reference_folder_groups'));
    assert.ok(tableExists(db, 'youtube_comments'));
    assert.equal(expected.length, 4, 'P1.2 adds 011_reference_curation.sql');

    db.close();
  } finally {
    cleanup(ws);
  }
});

test('runMigrations: idempotent on re-execution', () => {
  const ws = makeTempWorkspace();
  try {
    const first = openDb({ path: ws.dbPath });
    runMigrations(first.db);
    first.db.close();

    const second = openDb({ path: ws.dbPath });
    const result = runMigrations(second.db);

    assert.equal(result.bootstrapped, false);
    assert.deepEqual(
      result.appliedMigrations,
      [],
      'No migrations should be re-applied on the second run',
    );
    assert.equal(result.totalLedgerCount, expectedMigrationFilenames().length);

    second.db.close();
  } finally {
    cleanup(ws);
  }
});

test('ensureWorkspaceMeta: inserts on first call, no-ops thereafter', () => {
  const ws = makeTempWorkspace();
  try {
    const { db } = openDb({ path: ws.dbPath });
    runMigrations(db);

    const first = ensureWorkspaceMeta(db, { schemaVersionLabel: 'phase1-test' });
    assert.equal(first.workspaceMetaCreated, true);
    assert.equal(first.schemaVersionLabel, 'phase1-test');

    const second = ensureWorkspaceMeta(db, { schemaVersionLabel: 'should-be-ignored' });
    assert.equal(second.workspaceMetaCreated, false);
    assert.equal(
      second.schemaVersionLabel,
      'phase1-test',
      'Second call must return the persisted label, not the new one',
    );

    db.close();
  } finally {
    cleanup(ws);
  }
});

test('workspace_meta CHECK enforces id = 1', () => {
  const ws = makeTempWorkspace();
  try {
    const { db } = openDb({ path: ws.dbPath });
    runMigrations(db);

    assert.throws(
      () => {
        db.prepare(
          `INSERT INTO workspace_meta (id, schema_version_label) VALUES (2, 'invalid')`,
        ).run();
      },
      /CHECK constraint failed/,
    );

    db.close();
  } finally {
    cleanup(ws);
  }
});

test('init.ts script: emits ok=true JSON line on fresh DB', () => {
  const ws = makeTempWorkspace();
  try {
    const result = spawnSync(
      'pnpm',
      ['tsx', INIT_SCRIPT, '--db', ws.dbPath, '--label', 'phase1-smoke'],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );

    assert.equal(result.status, 0, `init.ts exited non-zero. stderr:\n${result.stderr}`);

    const lines = result.stdout.trim().split('\n');
    const last = lines[lines.length - 1] as string;
    const parsed = JSON.parse(last) as Record<string, unknown>;

    assert.equal(parsed.ok, true);
    assert.equal(parsed.dbPath, ws.dbPath);
    assert.equal(parsed.created, true);
    assert.equal(parsed.workspaceMetaCreated, true);
    assert.equal(parsed.schemaVersionLabel, 'phase1-smoke');
    assert.ok(Array.isArray(parsed.appliedMigrations));
    assert.ok((parsed.appliedMigrations as string[]).length > 0);
    assert.ok(existsSync(ws.dbPath));
  } finally {
    cleanup(ws);
  }
});

test('init.ts script: re-run is idempotent and reports no new work', () => {
  const ws = makeTempWorkspace();
  try {
    const first = spawnSync('pnpm', ['tsx', INIT_SCRIPT, '--db', ws.dbPath], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    assert.equal(first.status, 0);

    const second = spawnSync('pnpm', ['tsx', INIT_SCRIPT, '--db', ws.dbPath], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    assert.equal(second.status, 0);

    const lines = second.stdout.trim().split('\n');
    const last = lines[lines.length - 1] as string;
    const parsed = JSON.parse(last) as {
      ok: boolean;
      created: boolean;
      appliedMigrations: string[];
      workspaceMetaCreated: boolean;
    };

    assert.equal(parsed.ok, true);
    assert.equal(parsed.created, false);
    assert.deepEqual(parsed.appliedMigrations, []);
    assert.equal(parsed.workspaceMetaCreated, false);
  } finally {
    cleanup(ws);
  }
});
