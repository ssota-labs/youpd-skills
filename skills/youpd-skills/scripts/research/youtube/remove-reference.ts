#!/usr/bin/env tsx

import { parseArgs } from 'node:util';

import { emitError, emitOk, openMigratedDb, runInTransaction } from '../../lib/youtube/common.ts';
import { getFolder, removeReferences } from '../../lib/youtube/references.ts';
import type { RemoveReferenceResult } from '../../lib/types/youtube.ts';

const ROUTE = 'remove-reference';

function parseCli(argv: string[]) {
  const { values } = parseArgs({
    args: argv,
    options: {
      'folder-id': { type: 'string' },
      'video-id': { type: 'string', multiple: true },
      db: { type: 'string', short: 'd' },
    },
    strict: true,
    allowPositionals: false,
  });

  if (typeof values['folder-id'] !== 'string') throw new Error('--folder-id 가 필요합니다.');
  const videoIds = values['video-id'] ?? [];
  if (videoIds.length === 0) throw new Error('--video-id 가 하나 이상 필요합니다.');

  return { folderId: values['folder-id'], videoIds, dbPath: values.db };
}

async function main(): Promise<void> {
  const args = parseCli(process.argv.slice(2));
  const { db, dbPath } = openMigratedDb(args.dbPath ? { path: args.dbPath } : {});

  try {
    const result = runInTransaction(db, (): RemoveReferenceResult => {
      getFolder(db, args.folderId);
      const removedCount = removeReferences(db, args.folderId, args.videoIds);
      return { folderId: args.folderId, removedCount, videoIds: args.videoIds };
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
