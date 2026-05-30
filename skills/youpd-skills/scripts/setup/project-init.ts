#!/usr/bin/env tsx
/**
 * Create channel workspace metadata: .youpd/project.json + docs/channel-brief.md
 * Run with channel folder as cwd (or --dir).
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { SKILL_ROOT } from '../lib/skill-root.ts';

interface ProjectDoc {
  id: string;
  displayName: string;
  channel: { oneLiner: string; audiences: string[]; platforms: string[] };
  toolkit: { path: string };
  workspace: { dbPath: string };
}

function parseCli(argv: string[]) {
  const { values } = parseArgs({
    args: argv,
    options: {
      dir: { type: 'string', short: 'd' },
      id: { type: 'string' },
      name: { type: 'string', short: 'n' },
      'one-liner': { type: 'string' },
      toolkit: { type: 'string', short: 't' },
      audiences: { type: 'string' },
    },
    strict: true,
    allowPositionals: false,
  });

  const id = values.id?.trim();
  const oneLiner = values['one-liner']?.trim();
  if (!id || !oneLiner) {
    process.stdout.write(
      `${JSON.stringify({ ok: false, code: 'validation_error', message: '--id and --one-liner required' })}\n`,
    );
    process.exit(1);
  }

  const channelDir = resolve(values.dir ?? process.cwd());
  return {
    channelDir,
    id,
    displayName: values.name?.trim() || id,
    oneLiner,
    toolkitPath: resolve(values.toolkit?.trim() || SKILL_ROOT),
    audiences: values.audiences
      ? values.audiences.split(',').map((s) => s.trim()).filter(Boolean)
      : [],
  };
}

function main(): void {
  const args = parseCli(process.argv.slice(2));
  const youpdDir = resolve(args.channelDir, '.youpd');
  const docsDir = resolve(args.channelDir, 'docs');
  mkdirSync(youpdDir, { recursive: true });
  mkdirSync(docsDir, { recursive: true });

  const doc: ProjectDoc = {
    id: args.id,
    displayName: args.displayName,
    channel: {
      oneLiner: args.oneLiner,
      audiences: args.audiences,
      platforms: ['youtube-long'],
    },
    toolkit: { path: args.toolkitPath },
    workspace: { dbPath: './.youpd/workspace.db' },
  };

  const projectPath = resolve(youpdDir, 'project.json');
  writeFileSync(projectPath, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');

  const brief = [
    `# Channel brief — ${args.id}`,
    '',
    '| 항목 | 내용 |',
    '|------|------|',
    `| 프로젝트 ID | ${args.id} |`,
    `| 표시 이름 | ${args.displayName} |`,
    `| 한 줄 소개 | ${args.oneLiner} |`,
    '',
    '## youpd',
    '',
    `| 툴킷 | \`${args.toolkitPath}\` |`,
    '| 워크스페이스 DB | `./.youpd/workspace.db` |',
    '',
  ].join('\n');

  const briefPath = resolve(docsDir, 'channel-brief.md');
  writeFileSync(briefPath, brief, 'utf8');

  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      route: 'setup/project-init',
      channelDir: args.channelDir,
      projectPath,
      briefPath,
      toolkitPath: args.toolkitPath,
      next: `YOUPD_WORKSPACE_DB=${resolve(youpdDir, 'workspace.db')} pnpm --dir "${args.toolkitPath}" exec tsx scripts/setup/bootstrap.ts`,
    })}\n`,
  );
}

main();
