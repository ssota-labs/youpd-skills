#!/usr/bin/env tsx

import { parseArgs } from 'node:util';

import {
  emitError,
  emitOk,
  openMigratedDb,
  parsePositiveInt,
  runInTransaction,
  nowIso,
} from '../../lib/youtube/common.ts';
import {
  completeCommentFetchSession,
  createCommentFetchSession,
  getVideoIdsForFolder,
  upsertTopLevelComments,
} from '../../lib/youtube/references.ts';
import { youtubeApiRequest, type YoutubeCommentThreadItem, type YoutubeListResponse } from '../../lib/youtube/api.ts';
import { requireYoutubeApiKey } from '../../lib/youtube/quota.ts';
import type { FetchCommentsResult } from '../../lib/types/youtube.ts';

const ROUTE = 'fetch-comments';

function parseCli(argv: string[]) {
  const { values } = parseArgs({
    args: argv,
    options: {
      'video-id': { type: 'string', multiple: true },
      'folder-id': { type: 'string' },
      'discovery-run-id': { type: 'string' },
      'max-comments-per-video': { type: 'string' },
      order: { type: 'string' },
      db: { type: 'string', short: 'd' },
    },
    strict: true,
    allowPositionals: false,
  });

  const order = values.order ?? 'relevance';
  if (!['relevance', 'time'].includes(order)) {
    throw new Error('--order 는 relevance 또는 time 이어야 합니다.');
  }

  return {
    videoIds: values['video-id'] ?? [],
    folderId: values['folder-id'],
    discoveryRunId: values['discovery-run-id'],
    maxCommentsPerVideo: Math.min(
      parsePositiveInt(values['max-comments-per-video'], 20, '--max-comments-per-video'),
      50,
    ),
    order: order as 'relevance' | 'time',
    dbPath: values.db,
  };
}

async function main(): Promise<void> {
  const args = parseCli(process.argv.slice(2));
  const apiKey = requireYoutubeApiKey();
  const { db, dbPath } = openMigratedDb(args.dbPath ? { path: args.dbPath } : {});

  try {
    const videoIds = args.folderId ? getVideoIdsForFolder(db, args.folderId) : args.videoIds;
    if (videoIds.length === 0) {
      throw new Error('--video-id 또는 영상이 들어 있는 --folder-id 가 필요합니다.');
    }

    const fetchSessionIds: string[] = [];
    const languagePrompts: Array<{ videoId: string; commentText: string }> = [];
    let insertedCommentCount = 0;
    let skippedExistingCount = 0;
    let unitsConsumed = 0;

    for (const videoId of videoIds) {
      const rawParams = {
        part: 'snippet',
        videoId,
        maxResults: args.maxCommentsPerVideo,
        order: args.order,
        textFormat: 'plainText',
      };
      const fetchSessionId = createCommentFetchSession(db, {
        videoId,
        folderId: args.folderId,
        discoveryRunId: args.discoveryRunId,
        order: args.order,
        maxResults: args.maxCommentsPerVideo,
        rawParams,
      });
      fetchSessionIds.push(fetchSessionId);

      const response = await youtubeApiRequest<YoutubeListResponse<YoutubeCommentThreadItem>>(db, apiKey, {
        route: ROUTE,
        resource: 'commentThreads',
        params: rawParams,
        audit: { operation: 'commentThreads.list', units: 1 },
      });
      unitsConsumed += 1;

      const collectedAt = nowIso();
      const inserted = runInTransaction(db, () => {
        const result = upsertTopLevelComments(db, {
          videoId,
          fetchSessionId,
          comments: response.items ?? [],
          collectedAt,
        });
        completeCommentFetchSession(db, fetchSessionId, {
          resultCount: response.items?.length ?? 0,
          unitsConsumed: 1,
        });
        return result;
      });
      insertedCommentCount += inserted.insertedCount;
      skippedExistingCount += inserted.skippedExistingCount;
      languagePrompts.push(...inserted.languagePrompts);
    }

    const result: FetchCommentsResult = {
      fetchedVideoCount: videoIds.length,
      insertedCommentCount,
      skippedExistingCount,
      fetchSessionIds,
      languagePrompts,
    };
    emitOk(ROUTE, dbPath, result, unitsConsumed);
  } finally {
    db.close();
  }
}

main().catch((err: unknown) => {
  emitError(ROUTE, err);
  process.exit(1);
});
