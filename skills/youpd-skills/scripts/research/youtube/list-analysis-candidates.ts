#!/usr/bin/env tsx

import { parseArgs } from 'node:util';

import { emitError, emitOk, openMigratedDb, parsePositiveInt } from '../../lib/youtube/common.ts';
import { listAnalysisCandidates, type AnalysisKind } from '../../lib/analysis/persist.ts';
import type { ListAnalysisCandidatesResult } from '../../lib/types/analysis.ts';

const ROUTE = 'list-analysis-candidates';

function parseKind(raw: string | undefined): AnalysisKind {
  if (raw === 'title' || raw === 'thumbnail') return raw;
  throw new Error('--kind 는 title 또는 thumbnail 이어야 합니다.');
}

function parseCli(argv: string[]) {
  const { values } = parseArgs({
    args: argv,
    options: {
      kind: { type: 'string' },
      'folder-id': { type: 'string' },
      'folder-group-id': { type: 'string' },
      'video-id': { type: 'string', multiple: true },
      'include-analyzed': { type: 'boolean', default: false },
      limit: { type: 'string', short: 'l' },
      db: { type: 'string', short: 'd' },
    },
    strict: true,
    allowPositionals: false,
  });

  return {
    kind: parseKind(values.kind),
    folderId: values['folder-id'],
    folderGroupId: values['folder-group-id'],
    videoIds: values['video-id'] ?? [],
    includeAnalyzed: values['include-analyzed'] ?? false,
    limit: parsePositiveInt(values.limit, 50, '--limit'),
    dbPath: values.db,
  };
}

async function main(): Promise<void> {
  const args = parseCli(process.argv.slice(2));
  const { db, dbPath } = openMigratedDb(args.dbPath ? { path: args.dbPath } : {});

  try {
    const candidates = listAnalysisCandidates(db, {
      kind: args.kind,
      folderId: args.folderId,
      folderGroupId: args.folderGroupId,
      videoIds: args.videoIds.length > 0 ? args.videoIds : undefined,
      includeAnalyzed: args.includeAnalyzed,
      limit: args.limit,
    });
    const result: ListAnalysisCandidatesResult = { kind: args.kind, candidates };
    emitOk(ROUTE, dbPath, result, 0);
  } finally {
    db.close();
  }
}

main().catch((err: unknown) => {
  emitError(ROUTE, err);
  process.exit(1);
});
