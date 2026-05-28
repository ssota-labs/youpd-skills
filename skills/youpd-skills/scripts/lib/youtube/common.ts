import { openDb, type Db, type OpenDbOptions, type OpenDbResult } from '../db/client.ts';
import { runMigrations } from '../db/migrate.ts';
import type { RouteError, RouteOk, YoutubeRouteErrorCode } from '../types/youtube.ts';

export class YoutubeRouteError extends Error {
  readonly code: YoutubeRouteErrorCode;
  readonly detail: unknown;

  constructor(code: YoutubeRouteErrorCode, message: string, detail?: unknown) {
    super(message);
    this.name = 'YoutubeRouteError';
    this.code = code;
    this.detail = detail;
  }
}

export function fail(code: YoutubeRouteErrorCode, message: string, detail?: unknown): never {
  throw new YoutubeRouteError(code, message, detail);
}

export function emitOk<T>(route: string, dbPath: string, result: T, unitsConsumed = 0): void {
  const payload: RouteOk<T> = { ok: true, route, dbPath, result, unitsConsumed };
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

export function emitError(route: string, err: unknown): void {
  const payload = toRouteError(route, err);
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

export function toRouteError(route: string, err: unknown): RouteError {
  if (err instanceof YoutubeRouteError) {
    const payload: RouteError = { ok: false, route, code: err.code, message: err.message };
    if (err.detail !== undefined) payload.detail = err.detail;
    return payload;
  }
  return {
    ok: false,
    route,
    code: 'unknown',
    message: (err as Error).message ?? String(err),
  };
}

export function openMigratedDb(options: OpenDbOptions = {}): OpenDbResult {
  const result = openDb(options);
  try {
    runMigrations(result.db);
    return result;
  } catch (err) {
    result.db.close();
    throw new YoutubeRouteError('db_error', `DB 마이그레이션 실패: ${(err as Error).message}`, {
      filename: (err as Error & { filename?: string }).filename,
    });
  }
}

export function runInTransaction<T>(db: Db, fn: () => T): T {
  db.exec('BEGIN');
  try {
    const value = fn();
    db.exec('COMMIT');
    return value;
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // ignore rollback errors on an already-aborted transaction
    }
    throw err;
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayUtc(): string {
  return nowIso().slice(0, 10);
}

export function normalizeKeyword(keyword: string): string {
  return keyword
    .trim()
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .replace(/[A-Za-z]+/g, (match) => match.toLowerCase());
}

export function normalizeRegion(region: string | undefined): string {
  return (region ?? 'KR').trim().toUpperCase();
}

export function parsePositiveInt(raw: string | undefined, fallback: number, name: string): number {
  if (raw == null || raw.length === 0) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    fail('validation_error', `${name} 값은 양의 정수여야 합니다.`, { value: raw });
  }
  return parsed;
}

export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function resolveHotDate(input: string): string {
  if (input === 'today') return todayUtc();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    fail('validation_error', '--date 값은 today 또는 YYYY-MM-DD 형식이어야 합니다.', { value: input });
  }
  return input;
}

export function gradeRank(grade: string): number {
  switch (grade) {
    case 'Worst':
      return 0;
    case 'Bad':
      return 1;
    case 'Normal':
      return 2;
    case 'Good':
      return 3;
    case 'Great':
      return 4;
    default:
      return -1;
  }
}

export function meetsMinGrade(actual: string, minGrade: string): boolean {
  return gradeRank(actual) >= gradeRank(minGrade);
}
