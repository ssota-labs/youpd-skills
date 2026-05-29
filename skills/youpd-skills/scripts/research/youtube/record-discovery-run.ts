#!/usr/bin/env tsx

import { parseArgs } from 'node:util';

import { emitError, emitOk, openMigratedDb, runInTransaction } from '../../lib/youtube/common.ts';
import { createDiscoveryRun, parseConsumerStage } from '../../lib/youtube/references.ts';
import type { ConsumerStage, RecordDiscoveryRunResult } from '../../lib/types/youtube.ts';

const ROUTE = 'record-discovery-run';

function parseCli(argv: string[]) {
  const { values } = parseArgs({
    args: argv,
    options: {
      'folder-group-id': { type: 'string' },
      'request-text': { type: 'string' },
      audience: { type: 'string' },
      'seed-theme': { type: 'string' },
      stage: { type: 'string', multiple: true },
      'keyword-probe-summary': { type: 'string' },
      'search-session-id': { type: 'string', multiple: true },
      complete: { type: 'boolean' },
      db: { type: 'string', short: 'd' },
    },
    strict: true,
    allowPositionals: false,
  });

  return {
    folderGroupId: values['folder-group-id'],
    requestText: values['request-text'],
    audience: values.audience,
    seedTheme: values['seed-theme'],
    stages: (values.stage ?? []).map((stage) => parseConsumerStage(stage)) as ConsumerStage[],
    keywordProbeSummary: values['keyword-probe-summary'],
    searchSessionIds: values['search-session-id'] ?? [],
    complete: values.complete === true,
    dbPath: values.db,
  };
}

async function main(): Promise<void> {
  const args = parseCli(process.argv.slice(2));
  const { db, dbPath } = openMigratedDb(args.dbPath ? { path: args.dbPath } : {});

  try {
    const result = runInTransaction(db, (): RecordDiscoveryRunResult => {
      const discoveryRunId = createDiscoveryRun(db, {
        folderGroupId: args.folderGroupId,
        requestText: args.requestText,
        audience: args.audience,
        seedTheme: args.seedTheme,
        selectedStages: args.stages,
        keywordProbeSummary: args.keywordProbeSummary,
        searchSessionIds: args.searchSessionIds,
        complete: args.complete,
      });
      return {
        discoveryRunId,
        folderGroupId: args.folderGroupId ?? null,
        selectedStages: args.stages,
        searchSessionIds: args.searchSessionIds,
      };
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
