#!/usr/bin/env tsx

import { parseArgs } from 'node:util';

import {
  emitError,
  emitOk,
  openMigratedDb,
  parsePositiveInt,
  runInTransaction,
} from '../../lib/youtube/common.ts';
import {
  getFolder,
  insertCuration,
  parseConsumerStage,
  selectCurationCandidates,
} from '../../lib/youtube/references.ts';
import type { CurateReferencesResult, ScoreGrade } from '../../lib/types/youtube.ts';

const ROUTE = 'curate-references';

function parseCli(argv: string[]) {
  const { values } = parseArgs({
    args: argv,
    options: {
      'folder-id': { type: 'string' },
      'search-session-id': { type: 'string' },
      'hot-date': { type: 'string' },
      region: { type: 'string', short: 'r' },
      'video-id': { type: 'string', multiple: true },
      stage: { type: 'string' },
      'discovery-run-id': { type: 'string' },
      'min-grade': { type: 'string' },
      limit: { type: 'string', short: 'l' },
      reason: { type: 'string' },
      db: { type: 'string', short: 'd' },
    },
    strict: true,
    allowPositionals: false,
  });

  if (typeof values['folder-id'] !== 'string') throw new Error('--folder-id 가 필요합니다.');

  return {
    folderId: values['folder-id'],
    searchSessionId: values['search-session-id'],
    hotDate: values['hot-date'],
    region: (values.region ?? 'KR').toUpperCase(),
    videoIds: values['video-id'] ?? [],
    stage: parseConsumerStage(values.stage),
    discoveryRunId: values['discovery-run-id'],
    minGrade: (values['min-grade'] ?? 'Good') as ScoreGrade,
    limit: parsePositiveInt(values.limit, 10, '--limit'),
    reason: values.reason,
    dbPath: values.db,
  };
}

async function main(): Promise<void> {
  const args = parseCli(process.argv.slice(2));
  const { db, dbPath } = openMigratedDb(args.dbPath ? { path: args.dbPath } : {});

  try {
    const result = runInTransaction(db, (): CurateReferencesResult => {
      getFolder(db, args.folderId);
      const candidates = selectCurationCandidates(db, {
        searchSessionId: args.searchSessionId,
        hotDate: args.hotDate,
        region: args.region,
        videoIds: args.videoIds,
        minGrade: args.minGrade as Exclude<ScoreGrade, 'Unknown'>,
        limit: args.limit,
      });
      const inserted = insertCuration(db, {
        folderId: args.folderId,
        stage: args.stage,
        discoveryRunId: args.discoveryRunId,
        reason: args.reason,
        candidates,
      });
      return { folderId: args.folderId, ...inserted };
    });

    emitOk(ROUTE, dbPath, result, 0);
  } finally {
    db.close();
  }
}

main().catch((err: unknown) => {
  emitError(ROUTE, err);
  process.exit(1);
});
