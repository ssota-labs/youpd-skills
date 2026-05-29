#!/usr/bin/env tsx

import { parseArgs } from 'node:util';

import { emitError, emitOk, openMigratedDb, parsePositiveInt } from '../../lib/youtube/common.ts';
import { listReferences, parseConsumerStage } from '../../lib/youtube/references.ts';
import type { ListReferencesResult } from '../../lib/types/youtube.ts';

const ROUTE = 'list-references';

function parseCli(argv: string[]) {
  const { values } = parseArgs({
    args: argv,
    options: {
      'folder-id': { type: 'string' },
      'folder-group-id': { type: 'string' },
      stage: { type: 'string' },
      limit: { type: 'string', short: 'l' },
      order: { type: 'string' },
      db: { type: 'string', short: 'd' },
    },
    strict: true,
    allowPositionals: false,
  });

  const order = values.order ?? 'score';
  if (!['score', 'added_at', 'published_at'].includes(order)) {
    throw new Error('--order 는 score, added_at, published_at 중 하나여야 합니다.');
  }

  return {
    folderId: values['folder-id'],
    folderGroupId: values['folder-group-id'],
    stage: values.stage ? parseConsumerStage(values.stage) : undefined,
    limit: parsePositiveInt(values.limit, 50, '--limit'),
    order: order as 'score' | 'added_at' | 'published_at',
    dbPath: values.db,
  };
}

async function main(): Promise<void> {
  const args = parseCli(process.argv.slice(2));
  const { db, dbPath } = openMigratedDb(args.dbPath ? { path: args.dbPath } : {});

  try {
    const result: ListReferencesResult = {
      videos: listReferences(db, {
        folderId: args.folderId,
        folderGroupId: args.folderGroupId,
        stage: args.stage,
        limit: args.limit,
        order: args.order,
      }),
    };
    emitOk(ROUTE, dbPath, result, 0);
  } finally {
    db.close();
  }
}

main().catch((err: unknown) => {
  emitError(ROUTE, err);
  process.exit(1);
});
