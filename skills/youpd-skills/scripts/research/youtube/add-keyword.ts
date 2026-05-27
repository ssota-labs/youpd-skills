#!/usr/bin/env tsx

import { parseArgs } from 'node:util';
import { z } from 'zod';

import {
  emitJson,
  openMigratedDb,
  parseSearchOrder,
  toErrorResult,
  upsertKeyword,
} from '../../lib/youtube/core.ts';

const ArgsSchema = z.object({
  keyword: z.string().min(1),
  region: z.string().min(2).max(2).default('KR'),
  order: z.string().optional(),
});

function parseCli(argv: string[]): z.infer<typeof ArgsSchema> {
  const { values } = parseArgs({
    args: argv,
    options: {
      keyword: { type: 'string', short: 'k' },
      region: { type: 'string', short: 'r' },
      order: { type: 'string', short: 'o' },
    },
    strict: true,
    allowPositionals: false,
  });

  return ArgsSchema.parse({
    keyword: values.keyword,
    region: values.region ?? 'KR',
    order: values.order,
  });
}

async function main(): Promise<void> {
  const args = parseCli(process.argv.slice(2));
  const { db } = openMigratedDb();

  try {
    const result = upsertKeyword(db, {
      keyword: args.keyword,
      region: args.region,
      order: parseSearchOrder(args.order),
    });
    emitJson({ ok: true, ...result });
  } finally {
    db.close();
  }
}

main().catch((err: unknown) => {
  emitJson(toErrorResult(err));
  process.exit(1);
});
