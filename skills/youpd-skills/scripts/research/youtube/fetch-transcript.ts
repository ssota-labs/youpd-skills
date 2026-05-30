#!/usr/bin/env tsx

import { parseArgs } from 'node:util';

import { persistFetchedTranscript } from '../../lib/transcript/persist.ts';
import { fetchTimedtextTranscript } from '../../lib/transcript/timedtext.ts';
import {
  emitError,
  emitOk,
  openMigratedDb,
  runInTransaction,
  YoutubeRouteError,
} from '../../lib/youtube/common.ts';
import type { FetchTranscriptResult } from '../../lib/types/transcript.ts';

const ROUTE = 'fetch-transcript';

function parseCli(argv: string[]) {
  const { values } = parseArgs({
    args: argv,
    options: {
      'video-id': { type: 'string', multiple: true },
      lang: { type: 'string', default: 'ko,en' },
      'allow-asr': { type: 'boolean', default: false },
      db: { type: 'string', short: 'd' },
    },
    strict: true,
    allowPositionals: false,
  });

  const videoIds = values['video-id'] ?? [];
  if (videoIds.length === 0) {
    throw new Error('--video-id 가 하나 이상 필요합니다.');
  }

  const langPrefs = (values.lang ?? 'ko,en')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return {
    videoIds,
    langPrefs: langPrefs.length > 0 ? langPrefs : ['ko', 'en'],
    allowAsr: values['allow-asr'] ?? false,
    dbPath: values.db,
  };
}

async function main(): Promise<void> {
  const args = parseCli(process.argv.slice(2));

  if (args.allowAsr) {
    const key = process.env.OPENAI_API_KEY;
    if (!key || key.trim().length === 0) {
      throw new Error(
        'ASR 은 OPENAI_API_KEY 가 필요합니다. .env.example 을 참고하거나 timedtext 경로만 사용하세요.',
      );
    }
    throw new Error(
      'ASR(Whisper) 경로는 아직 구현되지 않았습니다. 공개 timedtext 자막만 지원합니다. --allow-asr 없이 다시 시도하세요.',
    );
  }

  const { db, dbPath } = openMigratedDb(args.dbPath ? { path: args.dbPath } : {});

  const results: FetchTranscriptResult['items'] = [];
  const failures: FetchTranscriptResult['failures'] = [];

  try {
    for (const videoId of args.videoIds) {
      try {
        const fetched = await fetchTimedtextTranscript(videoId, args.langPrefs);
        const persisted = runInTransaction(db, () => persistFetchedTranscript(db, videoId, fetched));
        results.push({
          videoId,
          source: persisted.source,
          language: persisted.language,
          replaced: persisted.replaced,
          segmentCount: fetched.segments.length,
          charCount: fetched.fullText.length,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const code = err instanceof YoutubeRouteError ? err.code : 'unknown';
        failures.push({ videoId, message, code });
      }
    }

    const payload: FetchTranscriptResult = {
      succeeded: results.length,
      failed: failures.length,
      items: results,
      failures,
    };
    emitOk(ROUTE, dbPath, payload, 0);
  } finally {
    db.close();
  }
}

main().catch((err: unknown) => {
  emitError(ROUTE, err);
  process.exit(1);
});
