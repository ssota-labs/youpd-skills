#!/usr/bin/env tsx

import { parseArgs } from 'node:util';

import { saveTitleAnalysis } from '../../lib/analysis/persist.ts';
import { emitError, emitOk, openMigratedDb, runInTransaction } from '../../lib/youtube/common.ts';
import type { SaveTitleAnalysisResult } from '../../lib/types/analysis.ts';

const ROUTE = 'save-title-analysis';

function parseCli(argv: string[]) {
  const { values } = parseArgs({
    args: argv,
    options: {
      'video-id': { type: 'string' },
      'hook-primary': { type: 'string' },
      'hook-secondary': { type: 'string' },
      'title-shape': { type: 'string', multiple: true },
      'title-tone': { type: 'string' },
      reasoning: { type: 'string' },
      'free-tag': { type: 'string', multiple: true },
      reanalyze: { type: 'boolean', default: false },
      db: { type: 'string', short: 'd' },
    },
    strict: true,
    allowPositionals: false,
  });

  if (typeof values['video-id'] !== 'string') throw new Error('--video-id 가 필요합니다.');
  if (typeof values['hook-primary'] !== 'string') throw new Error('--hook-primary 가 필요합니다.');
  if (typeof values['title-tone'] !== 'string') throw new Error('--title-tone 가 필요합니다.');
  if (typeof values.reasoning !== 'string') throw new Error('--reasoning 이 필요합니다.');

  return {
    videoId: values['video-id'],
    hookPrimary: values['hook-primary'],
    hookSecondary: values['hook-secondary'],
    titleShapes: values['title-shape'] ?? [],
    titleTone: values['title-tone'],
    reasoning: values.reasoning,
    freeTags: values['free-tag'] ?? [],
    reanalyze: values.reanalyze ?? false,
    dbPath: values.db,
  };
}

async function main(): Promise<void> {
  const args = parseCli(process.argv.slice(2));
  const { db, dbPath } = openMigratedDb(args.dbPath ? { path: args.dbPath } : {});

  try {
    const result = runInTransaction(db, (): SaveTitleAnalysisResult =>
      saveTitleAnalysis(db, {
        videoId: args.videoId,
        hookPrimary: args.hookPrimary,
        hookSecondary: args.hookSecondary,
        titleShapes: args.titleShapes,
        titleTone: args.titleTone,
        reasoning: args.reasoning,
        freeTags: args.freeTags,
        reanalyze: args.reanalyze,
      }),
    );
    emitOk(ROUTE, dbPath, result, 0);
  } finally {
    db.close();
  }
}

main().catch((err: unknown) => {
  emitError(ROUTE, err);
  process.exit(1);
});
