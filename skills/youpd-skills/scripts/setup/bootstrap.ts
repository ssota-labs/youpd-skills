#!/usr/bin/env tsx
/**
 * Toolkit bootstrap: Node/pnpm check, pnpm install in SKILL_ROOT, YouTube BYOK.
 * Agents run this before workspace/init — users do not run pnpm install manually.
 */

import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { hasYoutubeApiKey, loadSkillEnv, SKILL_ROOT } from '../lib/skill-root.ts';
import type { BootstrapResult } from '../lib/types/setup.ts';

const DEFAULT_ENV_PORT = 3848;

function emit(result: BootstrapResult): void {
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

function parseNodeMajor(): number | null {
  const m = /^v(\d+)/.exec(process.version);
  return m ? Number.parseInt(m[1]!, 10) : null;
}

function ensureDependencies(): { ok: true; installed: boolean } | { ok: false; message: string; detail?: unknown } {
  const nodeModules = resolve(SKILL_ROOT, 'node_modules');
  if (existsSync(nodeModules)) {
    return { ok: true, installed: false };
  }

  const pnpmProbe = spawnSync('pnpm', ['--version'], { encoding: 'utf8' });
  if (pnpmProbe.error || pnpmProbe.status !== 0 || !pnpmProbe.stdout?.trim()) {
    return { ok: false, message: 'pnpm 이 필요합니다. Node 24+ 설치 후 pnpm 10+ 를 설치하세요.' };
  }

  const run = spawnSync('pnpm', ['install'], {
    cwd: SKILL_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (run.status !== 0) {
    return {
      ok: false,
      message: 'pnpm install 실패',
      detail: { stderr: run.stderr, stdout: run.stdout, status: run.status },
    };
  }

  return { ok: true, installed: true };
}

function main(): void {
  parseArgs({ args: process.argv.slice(2), options: {}, strict: false });

  const nodeMajor = parseNodeMajor();
  if (nodeMajor === null || nodeMajor < 24) {
    emit({
      ok: false,
      code: 'node_version',
      message: `Node 24 이상이 필요합니다 (현재 ${process.version}).`,
      skillRoot: SKILL_ROOT,
    });
    process.exit(1);
  }

  const deps = ensureDependencies();
  if (!deps.ok) {
    emit({
      ok: false,
      code: deps.message.includes('pnpm install') ? 'install_failed' : 'pnpm_missing',
      message: deps.message,
      skillRoot: SKILL_ROOT,
      detail: deps.detail,
    });
    process.exit(1);
  }

  loadSkillEnv();

  if (!hasYoutubeApiKey()) {
    emit({
      ok: false,
      code: 'missing_api_key',
      message:
        'YOUTUBE_API_KEY 가 없습니다. 브라우저 설정 화면을 띄운 뒤 저장하세요. 키 값은 채팅에 붙여넣지 마세요.',
      skillRoot: SKILL_ROOT,
      envSetup: {
        hint: 'Run env serve, open url in browser, save, then re-run bootstrap.',
        serveCommand: `pnpm exec tsx scripts/setup/env.ts --mode serve --port ${DEFAULT_ENV_PORT}`,
        defaultPort: DEFAULT_ENV_PORT,
      },
    });
    process.exit(1);
  }

  emit({
    ok: true,
    skillRoot: SKILL_ROOT,
    depsInstalled: deps.installed,
    youtubeKeyConfigured: true,
    nodeModulesPresent: true,
  });
}

main();
