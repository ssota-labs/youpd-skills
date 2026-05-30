#!/usr/bin/env tsx

import { parseArgs } from 'node:util';
import type { SQLInputValue } from 'node:sqlite';

import type { Db } from '../lib/db/client.ts';
import { emitError, emitOk, fail, openMigratedDb } from '../lib/youtube/common.ts';

const ROUTE = 'db/exec';

const DANGEROUS_PATTERN =
  /\b(DROP|ATTACH|DETACH|ALTER|CREATE|REPLACE|VACUUM|REINDEX|TRUNCATE)\b|;\s*\S|PRAGMA\s+(?!(foreign_keys|journal_mode|busy_timeout)\b)/i;

export interface DbExecResult {
  rows: Record<string, unknown>[];
  changes: number;
  lastInsertRowid: number | bigint;
}

function assertSafeSql(sql: string): void {
  const trimmed = sql.trim();
  if (trimmed.length === 0) {
    fail('validation_error', 'SQL 문이 비어 있습니다.');
  }
  if (trimmed.includes(';')) {
    fail('dangerous_scope', '단일 SQL 문만 실행할 수 있습니다. 세미콜론이 포함되어 있습니다.');
  }
  if (DANGEROUS_PATTERN.test(trimmed)) {
    fail('dangerous_scope', '허용되지 않는 SQL 범위입니다.', { sql: trimmed.slice(0, 120) });
  }
}

function parseParams(raw: string | undefined): SQLInputValue[] {
  if (raw == null || raw.length === 0) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      fail('validation_error', '--params 는 JSON 배열이어야 합니다.');
    }
    return parsed as SQLInputValue[];
  } catch {
    fail('validation_error', '--params JSON 파싱에 실패했습니다.', { raw });
  }
}

function runQuery(db: Db, sql: string, params: SQLInputValue[]): DbExecResult {
  assertSafeSql(sql);
  const upper = sql.trimStart().toUpperCase();
  if (upper.startsWith('SELECT') || upper.startsWith('WITH')) {
    const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
    return { rows, changes: 0, lastInsertRowid: 0 };
  }
  const result = db.prepare(sql).run(...params);
  return {
    rows: [],
    changes: Number(result.changes),
    lastInsertRowid: Number(result.lastInsertRowid),
  };
}

function parseCli(argv: string[]) {
  const { values } = parseArgs({
    args: argv,
    options: {
      sql: { type: 'string' },
      params: { type: 'string' },
      db: { type: 'string', short: 'd' },
    },
    strict: true,
    allowPositionals: false,
  });

  if (typeof values.sql !== 'string' || values.sql.trim().length === 0) {
    throw new Error('--sql 이 필요합니다.');
  }

  return {
    sql: values.sql,
    params: parseParams(values.params),
    dbPath: values.db,
  };
}

async function main(): Promise<void> {
  const args = parseCli(process.argv.slice(2));
  const { db, dbPath } = openMigratedDb(args.dbPath ? { path: args.dbPath } : {});

  try {
    const result = runQuery(db, args.sql, args.params);
    emitOk(ROUTE, dbPath, result, 0);
  } finally {
    db.close();
  }
}

main().catch((err: unknown) => {
  emitError(ROUTE, err);
  process.exit(1);
});
