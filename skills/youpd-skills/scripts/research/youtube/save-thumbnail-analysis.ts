#!/usr/bin/env tsx

import { parseArgs } from 'node:util';

import { saveThumbnailAnalysis } from '../../lib/analysis/persist.ts';
import { emitError, emitOk, openMigratedDb, runInTransaction } from '../../lib/youtube/common.ts';
import type { SaveThumbnailAnalysisResult } from '../../lib/types/analysis.ts';

const ROUTE = 'save-thumbnail-analysis';

function parseCli(argv: string[]) {
  const { values } = parseArgs({
    args: argv,
    options: {
      'video-id': { type: 'string' },
      'visual-hierarchy': { type: 'string' },
      'text-density': { type: 'string' },
      'face-treatment': { type: 'string' },
      'felt-emotion': { type: 'string' },
      'alignment-with-title': { type: 'string' },
      'alignment-reasoning': { type: 'string' },
      reasoning: { type: 'string' },
      'free-tag': { type: 'string', multiple: true },
      'thumbnail-url-used': { type: 'string' },
      reanalyze: { type: 'boolean', default: false },
      db: { type: 'string', short: 'd' },
    },
    strict: true,
    allowPositionals: false,
  });

  if (typeof values['video-id'] !== 'string') throw new Error('--video-id 가 필요합니다.');
  if (typeof values['visual-hierarchy'] !== 'string') {
    throw new Error('--visual-hierarchy 가 필요합니다.');
  }
  if (typeof values['text-density'] !== 'string') throw new Error('--text-density 가 필요합니다.');
  if (typeof values['felt-emotion'] !== 'string') throw new Error('--felt-emotion 이 필요합니다.');
  if (typeof values.reasoning !== 'string') throw new Error('--reasoning 이 필요합니다.');

  return {
    videoId: values['video-id'],
    visualHierarchy: values['visual-hierarchy'],
    textDensity: values['text-density'],
    faceTreatment: values['face-treatment'],
    feltEmotion: values['felt-emotion'],
    alignmentWithTitle: values['alignment-with-title'],
    alignmentReasoning: values['alignment-reasoning'],
    reasoning: values.reasoning,
    freeTags: values['free-tag'] ?? [],
    thumbnailUrlUsed: values['thumbnail-url-used'],
    reanalyze: values.reanalyze ?? false,
    dbPath: values.db,
  };
}

async function main(): Promise<void> {
  const args = parseCli(process.argv.slice(2));
  const { db, dbPath } = openMigratedDb(args.dbPath ? { path: args.dbPath } : {});

  try {
    const result = runInTransaction(db, (): SaveThumbnailAnalysisResult =>
      saveThumbnailAnalysis(db, {
        videoId: args.videoId,
        visualHierarchy: args.visualHierarchy,
        textDensity: args.textDensity,
        faceTreatment: args.faceTreatment,
        feltEmotion: args.feltEmotion,
        alignmentWithTitle: args.alignmentWithTitle,
        alignmentReasoning: args.alignmentReasoning,
        reasoning: args.reasoning,
        freeTags: args.freeTags,
        thumbnailUrlUsed: args.thumbnailUrlUsed,
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
