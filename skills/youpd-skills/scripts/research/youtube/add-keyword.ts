#!/usr/bin/env tsx

import { parseArgs } from 'node:util';

import {
  emitError,
  emitOk,
  openMigratedDb,
  parsePositiveInt,
} from '../../lib/youtube/common.ts';
import { upsertKeyword } from '../../lib/youtube/write.ts';

const ROUTE = 'add-keyword';

function parseCli(argv: string[]) {
  const { values } = parseArgs({
    args: argv,
    options: {
      keyword: { type: 'string', short: 'k' },
      region: { type: 'string', short: 'r' },
      'ttl-hours': { type: 'string' },
      'initial-target-count': { type: 'string' },
      db: { type: 'string', short: 'd' },
      help: { type: 'boolean', short: 'h' },
    },
    strict: true,
    allowPositionals: false,
  });

  if (values.help) {
    process.stderr.write(
      [
        'add-keyword — youpd-skills',
        '',
        'Options:',
        '  --keyword, -k <text>           Keyword text (required)',
        '  --region, -r <code>            Region code (default KR)',
        '  --ttl-hours <hours>            Cache TTL hours (default 24)',
        '  --initial-target-count <n>     Initial collection target (default 500)',
        '  --db, -d <path>                Workspace DB path override',
      ].join('\n'),
    );
    process.exit(0);
  }

  if (typeof values.keyword !== 'string' || values.keyword.length === 0) {
    throw new Error('--keyword 가 필요합니다.');
  }

  return {
    keyword: values.keyword,
    region: values.region ?? 'KR',
    ttlHours: parsePositiveInt(values['ttl-hours'], 24, '--ttl-hours'),
    initialTargetCount: parsePositiveInt(values['initial-target-count'], 500, '--initial-target-count'),
    dbPath: values.db,
  };
}

async function main(): Promise<void> {
  const args = parseCli(process.argv.slice(2));
  const { db, dbPath } = openMigratedDb(args.dbPath ? { path: args.dbPath } : {});

  try {
    const result = upsertKeyword(db, {
      keyword: args.keyword,
      region: args.region,
      ttlHours: args.ttlHours,
      initialTargetCount: args.initialTargetCount,
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
