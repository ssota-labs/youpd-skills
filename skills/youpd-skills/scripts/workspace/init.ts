#!/usr/bin/env tsx
/**
 * `workspace/init` SKILL entry script.
 *
 * Usage:
 *   pnpm tsx skills/youpd-skills/scripts/workspace/init.ts
 *   pnpm tsx skills/youpd-skills/scripts/workspace/init.ts --db /tmp/test.db --label phase1-test
 *
 * Always emits a single-line JSON to stdout for the agent to parse, even on
 * failure. See references/workspace/init.md for the contract.
 */

import { parseArgs } from 'node:util';
import { existsSync } from 'node:fs';

import { openDb, resolveDbPath } from '../lib/db/client.ts';
import { loadSkillEnv, readPackageVersion } from '../lib/skill-root.ts';
import { ensureWorkspaceMeta, runMigrations } from '../lib/db/migrate.ts';
import type {
  WorkspaceInitError,
  WorkspaceInitErrorCode,
  WorkspaceInitOk,
  WorkspaceInitResult,
} from '../lib/types/workspace.ts';

interface CliArgs {
  dbPath?: string;
  label?: string;
}

function parseCli(argv: string[]): CliArgs {
  const { values } = parseArgs({
    args: argv,
    options: {
      db: { type: 'string', short: 'd' },
      label: { type: 'string', short: 'l' },
      json: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
    strict: true,
    allowPositionals: false,
  });

  if (values.help) {
    process.stderr.write(
      [
        'workspace/init — youpd-skills',
        '',
        'Options:',
        '  --db, -d <path>     Override workspace DB path',
        '  --label, -l <text>  schema_version_label override',
        '  --json              (default) emit JSON to stdout',
        '  --help, -h          Show this help',
        '',
      ].join('\n'),
    );
    process.exit(0);
  }

  const args: CliArgs = {};
  if (typeof values.db === 'string') args.dbPath = values.db;
  if (typeof values.label === 'string') args.label = values.label;
  return args;
}

function resolveSchemaVersionLabel(cliLabel?: string): string {
  return cliLabel ?? process.env.YOUPD_SCHEMA_VERSION_LABEL ?? readPackageVersion();
}

function emit(result: WorkspaceInitResult): void {
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

function fail(code: WorkspaceInitErrorCode, message: string, detail?: unknown): never {
  const err: WorkspaceInitError = { ok: false, code, message };
  if (detail !== undefined) err.detail = detail;
  emit(err);
  process.exit(1);
}

function checkNodeVersion(): void {
  const major = Number(process.versions.node.split('.')[0]);
  const minor = Number(process.versions.node.split('.')[1]);
  if (!Number.isFinite(major) || major < 24) {
    fail(
      'NODE_VERSION',
      `Node 24 이상이 필요합니다 (node:sqlite 사용). 현재: ${process.versions.node}`,
      { current: process.versions.node },
    );
  }
  // node:sqlite DatabaseSync landed in Node 22.5; we require 24 but guard anyway.
  if (major === 22 && Number.isFinite(minor) && minor < 5) {
    fail(
      'NODE_VERSION',
      `node:sqlite 는 Node 22.5+ 에서 사용 가능합니다. 현재: ${process.versions.node}`,
      { current: process.versions.node },
    );
  }
}

async function main(): Promise<void> {
  const args = parseCli(process.argv.slice(2));

  loadSkillEnv();
  checkNodeVersion();

  const dbPath = resolveDbPath(args.dbPath !== undefined ? { path: args.dbPath } : {});
  const dbExistedBefore = existsSync(dbPath);

  let openResult;
  try {
    openResult = openDb(args.dbPath !== undefined ? { path: args.dbPath } : {});
  } catch (err) {
    const errno = (err as NodeJS.ErrnoException).code;
    if (errno === 'EACCES' || errno === 'EPERM') {
      fail('DB_DIR_DENIED', `워크스페이스 디렉터리에 쓰기 권한이 없습니다: ${dbPath}`, {
        errno,
      });
    }
    fail('UNKNOWN', `DB 파일을 열 수 없습니다: ${(err as Error).message}`, {
      errno,
    });
  }

  const { db } = openResult;

  let migrationResult;
  try {
    migrationResult = runMigrations(db);
  } catch (err) {
    db.close();
    fail(
      'MIGRATION_FAILED',
      `마이그레이션 적용 중 실패했습니다: ${(err as Error).message}`,
      {
        filename: (err as Error & { filename?: string }).filename,
      },
    );
  }

  let metaResult;
  try {
    metaResult = ensureWorkspaceMeta(db, {
      schemaVersionLabel: resolveSchemaVersionLabel(args.label),
    });
  } catch (err) {
    db.close();
    fail('UNKNOWN', `workspace_meta 초기화 실패: ${(err as Error).message}`);
  } finally {
    // Note: if metaResult never assigned because of throw above, we already
    // exited via fail(); we still want to close the DB on success path.
  }

  db.close();

  const ok: WorkspaceInitOk = {
    ok: true,
    dbPath: openResult.dbPath,
    created: !dbExistedBefore,
    appliedMigrations: migrationResult.appliedMigrations,
    totalLedgerCount: migrationResult.totalLedgerCount,
    schemaVersionLabel: metaResult.schemaVersionLabel,
    workspaceMetaCreated: metaResult.workspaceMetaCreated,
  };
  emit(ok);
}

main().catch((err: unknown) => {
  fail('UNKNOWN', `예기치 않은 실패: ${(err as Error).message ?? String(err)}`);
});
