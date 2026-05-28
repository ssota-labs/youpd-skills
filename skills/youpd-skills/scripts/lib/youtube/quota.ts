import { createHash, randomUUID } from 'node:crypto';

import type { Db } from '../db/client.ts';
import type { YoutubeRouteErrorCode } from '../types/youtube.ts';
import { fail, nowIso, runInTransaction, todayUtc } from './common.ts';

export const DEFAULT_DAILY_QUOTA_LIMIT = 10_000;
export const API_KEY_LABEL = 'env';

export interface ApiKeyContext {
  key: string;
  label: string;
  fingerprint: string;
}

export interface AuditRecordInput {
  route: string;
  operation: string;
  units: number;
}

export function fingerprintApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex').slice(0, 16);
}

export function requireYoutubeApiKey(env: NodeJS.ProcessEnv = process.env): ApiKeyContext {
  const key = env.YOUTUBE_API_KEY?.trim();
  if (!key) {
    fail(
      'missing_api_key',
      'YOUTUBE_API_KEY 가 설정되어 있지 않습니다. `.env.example` 를 참고해 셸 환경변수를 설정해주세요.',
    );
  }
  return {
    key,
    label: API_KEY_LABEL,
    fingerprint: fingerprintApiKey(key),
  };
}

export function checkDailyQuota(db: Db, units: number, limit = DEFAULT_DAILY_QUOTA_LIMIT): void {
  const quotaDate = todayUtc();
  const row = db
    .prepare(
      `SELECT units_consumed FROM daily_quota_usage
       WHERE quota_date = ? AND api_key_label = ?`,
    )
    .get(quotaDate, API_KEY_LABEL) as { units_consumed: number } | undefined;
  const consumed = row?.units_consumed ?? 0;
  if (consumed + units > limit) {
    fail('quota_exceeded', '오늘 YouTube API quota 예상 사용량이 한도를 초과합니다.', {
      quotaDate,
      consumed,
      requested: units,
      limit,
    });
  }
}

export function classifyYoutubeError(
  status: number,
  body: unknown,
): { code: YoutubeRouteErrorCode; message: string; detail?: unknown } {
  const error = (body as { error?: { message?: string; errors?: Array<{ reason?: string }> } }).error;
  const reason = error?.errors?.[0]?.reason;
  const message = error?.message ?? `YouTube API 요청 실패 (HTTP ${status})`;
  const detail = { status, reason };

  if (
    reason === 'quotaExceeded' ||
    reason === 'dailyLimitExceeded' ||
    reason === 'rateLimitExceeded'
  ) {
    return { code: 'quota_exceeded', message, detail };
  }
  if (reason === 'keyInvalid' || reason === 'forbidden' || status === 401 || status === 403) {
    return { code: 'invalid_key', message, detail };
  }
  if (status === 404) {
    return { code: 'not_found', message, detail };
  }
  return { code: 'unknown', message, detail };
}

export function recordApiAudit(
  db: Db,
  apiKey: ApiKeyContext,
  input: AuditRecordInput,
  status: 'success' | 'error' | 'skipped',
  errorCode: YoutubeRouteErrorCode | null,
  rawError: string | null,
): void {
  const startedAt = nowIso();
  const completedAt = nowIso();
  const quotaDate = todayUtc();

  runInTransaction(db, () => {
    if (input.units > 0 && status !== 'skipped') {
      db.prepare(
        `INSERT INTO daily_quota_usage (quota_date, api_key_label, api_key_fingerprint, units_consumed)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(quota_date, api_key_label) DO UPDATE SET
           units_consumed = daily_quota_usage.units_consumed + excluded.units_consumed,
           api_key_fingerprint = excluded.api_key_fingerprint`,
      ).run(quotaDate, apiKey.label, apiKey.fingerprint, input.units);
    }

    db.prepare(
      `INSERT INTO api_call_audits
         (id, route, operation, units_consumed, status, error_code, api_key_label,
          api_key_fingerprint, started_at, completed_at, raw_error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      randomUUID(),
      input.route,
      input.operation,
      input.units,
      status,
      errorCode,
      apiKey.label,
      apiKey.fingerprint,
      startedAt,
      completedAt,
      rawError,
    );
  });
}
