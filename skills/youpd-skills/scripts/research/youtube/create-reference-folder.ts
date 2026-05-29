#!/usr/bin/env tsx

import { parseArgs } from 'node:util';

import { emitError, emitOk, openMigratedDb, runInTransaction } from '../../lib/youtube/common.ts';
import {
  DEFAULT_STAGE_FOLDERS,
  ensureFolder,
  ensureFolderGroup,
  parseFolderSpec,
} from '../../lib/youtube/references.ts';
import type { CreateReferenceFolderResult } from '../../lib/types/youtube.ts';

const ROUTE = 'create-reference-folder';

function parseCli(argv: string[]) {
  const { values } = parseArgs({
    args: argv,
    options: {
      'group-name': { type: 'string' },
      folder: { type: 'string', multiple: true },
      audience: { type: 'string' },
      'seed-theme': { type: 'string' },
      'intent-summary': { type: 'string' },
      description: { type: 'string' },
      'default-stage-folders': { type: 'boolean' },
      db: { type: 'string', short: 'd' },
    },
    strict: true,
    allowPositionals: false,
  });

  if (typeof values['group-name'] !== 'string' || values['group-name'].trim().length === 0) {
    throw new Error('--group-name 이 필요합니다.');
  }

  return {
    groupName: values['group-name'],
    folders: values.folder ?? [],
    audience: values.audience,
    seedTheme: values['seed-theme'],
    intentSummary: values['intent-summary'],
    description: values.description,
    defaultStageFolders: values['default-stage-folders'] === true,
    dbPath: values.db,
  };
}

async function main(): Promise<void> {
  const args = parseCli(process.argv.slice(2));
  const { db, dbPath } = openMigratedDb(args.dbPath ? { path: args.dbPath } : {});

  try {
    const result = runInTransaction(db, (): CreateReferenceFolderResult => {
      const group = ensureFolderGroup(db, {
        name: args.groupName,
        audience: args.audience,
        seedTheme: args.seedTheme,
        intentSummary: args.intentSummary,
        description: args.description,
      });

      const folderSpecs = [
        ...(args.defaultStageFolders ? DEFAULT_STAGE_FOLDERS : []),
        ...args.folders.map(parseFolderSpec),
      ];

      const folderIds: string[] = [];
      let createdFolderCount = 0;
      folderSpecs.forEach((folder, index) => {
        const ensured = ensureFolder(db, {
          groupId: group.id,
          name: folder.name,
          stage: folder.stage,
          sortOrder: index,
        });
        folderIds.push(ensured.id);
        if (ensured.created) createdFolderCount += 1;
      });

      return {
        folderGroupId: group.id,
        folderIds,
        createdGroup: group.created,
        createdFolderCount,
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
