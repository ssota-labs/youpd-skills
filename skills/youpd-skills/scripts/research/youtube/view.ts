#!/usr/bin/env tsx

import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { openDb, resolveDbPath } from '../../lib/db/client.ts';
import { emitError, emitOk, fail, parsePositiveInt } from '../../lib/youtube/common.ts';
import {
  loadWorkspaceViewPayload,
  renderWorkspaceViewHtml,
} from '../../lib/youtube/workspace-view.ts';

import type { ViewWorkspaceMode, ViewWorkspaceResult } from '../../lib/types/youtube.ts';

const ROUTE = 'view-workspace';

function parseCli(argv: string[]) {
  const { values } = parseArgs({
    args: argv,
    options: {
      mode: { type: 'string', default: 'static' },
      output: { type: 'string', short: 'o' },
      port: { type: 'string', short: 'p' },
      host: { type: 'string' },
      db: { type: 'string', short: 'd' },
    },
    strict: true,
    allowPositionals: false,
  });

  const mode = (values.mode ?? 'static') as ViewWorkspaceMode;
  if (mode !== 'static' && mode !== 'serve') {
    fail('validation_error', '--mode 는 static 또는 serve 여야 합니다.', { value: values.mode });
  }

  return {
    mode,
    outputPath: values.output,
    port: parsePositiveInt(values.port, 3847, '--port'),
    host: values.host ?? '127.0.0.1',
    dbPath: values.db,
  };
}

function defaultOutputPath(dbPath: string): string {
  const dbDir = dirname(dbPath);
  return resolve(dbDir, 'workspace-view.html');
}

function assertDbExists(dbPath: string): void {
  if (!existsSync(dbPath)) {
    fail('not_found', `워크스페이스 DB를 찾을 수 없습니다: ${dbPath}. 먼저 pnpm init 을 실행하세요.`, {
      dbPath,
    });
  }
}

function writeHtml(outputPath: string, html: string): void {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, html, 'utf8');
}

async function serveHtml(host: string, port: number, html: string): Promise<{ url: string }> {
  return new Promise((resolvePromise, reject) => {
    const server = createServer((_req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(html);
    });

    server.on('error', reject);
    server.listen(port, host, () => {
      resolvePromise({ url: `http://${host}:${port}/` });
    });
  });
}

async function main(): Promise<void> {
  const args = parseCli(process.argv.slice(2));
  const dbPath = resolveDbPath(args.dbPath ? { path: args.dbPath } : {});
  assertDbExists(dbPath);

  const { db } = openDb({
    path: dbPath,
    readonly: true,
    skipMkdir: true,
  });

  try {
    const payload = loadWorkspaceViewPayload(db, dbPath);
    const html = renderWorkspaceViewHtml(payload);
    const byteLength = Buffer.byteLength(html, 'utf8');

    if (args.mode === 'static') {
      const outputPath = resolve(args.outputPath ?? defaultOutputPath(dbPath));
      writeHtml(outputPath, html);
      const result: ViewWorkspaceResult = {
        mode: 'static',
        htmlPath: outputPath,
        byteLength,
      };
      emitOk(ROUTE, dbPath, result, 0);
      return;
    }

    const { url } = await serveHtml(args.host, args.port, html);
    const result: ViewWorkspaceResult = {
      mode: 'serve',
      url,
      host: args.host,
      port: args.port,
      byteLength,
    };
    emitOk(ROUTE, dbPath, result, 0);

    // Keep process alive until interrupted (serve mode is for local preview).
    await new Promise<void>(() => {});
  } finally {
    db.close();
  }
}

main().catch((err: unknown) => {
  emitError(ROUTE, err);
  process.exit(1);
});
