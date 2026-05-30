#!/usr/bin/env tsx

import { parseArgs } from 'node:util';

import { saveIntroAnalysis } from '../../lib/analysis/persist.ts';
import { emitError, emitOk, openMigratedDb, parsePositiveInt, runInTransaction } from '../../lib/youtube/common.ts';
import type { SaveIntroAnalysisResult } from '../../lib/types/analysis.ts';

const ROUTE = 'save-intro-analysis';

function parseCli(argv: string[]) {
  const { values } = parseArgs({
    args: argv,
    options: {
      'video-id': { type: 'string' },
      'window-sec': { type: 'string' },
      'hook-primary': { type: 'string' },
      'hook-secondary': { type: 'string' },
      'intro-structure': { type: 'string' },
      'pacing-signal': { type: 'string' },
      'reward-burden-balance': { type: 'string' },
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
  if (typeof values['intro-structure'] !== 'string') throw new Error('--intro-structure 가 필요합니다.');
  if (typeof values['pacing-signal'] !== 'string') throw new Error('--pacing-signal 가 필요합니다.');
  if (typeof values['reward-burden-balance'] !== 'string') {
    throw new Error('--reward-burden-balance 가 필요합니다.');
  }
  if (typeof values.reasoning !== 'string') throw new Error('--reasoning 이 필요합니다.');

  return {
    videoId: values['video-id'],
    windowSec: parsePositiveInt(values['window-sec'], 15, '--window-sec'),
    introHookPrimary: values['hook-primary'],
    introHookSecondary: values['hook-secondary'],
    introStructure: values['intro-structure'],
    pacingSignal: values['pacing-signal'],
    rewardBurdenBalance: values['reward-burden-balance'],
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
    const result = runInTransaction(db, (): SaveIntroAnalysisResult =>
      saveIntroAnalysis(db, {
        videoId: args.videoId,
        windowSec: args.windowSec,
        introHookPrimary: args.introHookPrimary,
        introHookSecondary: args.introHookSecondary,
        introStructure: args.introStructure,
        pacingSignal: args.pacingSignal,
        rewardBurdenBalance: args.rewardBurdenBalance,
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
