import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

import { envLocalPath, SKILL_ROOT } from '../lib/skill-root.ts';

const TEST_FILE_DIR = dirname(fileURLToPath(import.meta.url));
const BOOTSTRAP = resolve(TEST_FILE_DIR, '..', 'setup', 'bootstrap.ts');
const ENV_CHECK = resolve(TEST_FILE_DIR, '..', 'setup', 'env.ts');

function runTsx(script: string, args: string[] = [], env: NodeJS.ProcessEnv = process.env) {
  return spawnSync(process.execPath, ['--import', 'tsx/esm', script, ...args], {
    cwd: SKILL_ROOT,
    encoding: 'utf8',
    env,
  });
}

test('bootstrap: fails with missing_api_key when .env.local absent', () => {
  const path = envLocalPath();
  const backup = `${path}.bak-test`;
  const had = existsSync(path);
  if (had) renameSync(path, backup);
  try {
    const result = runTsx(BOOTSTRAP, [], { ...process.env, YOUTUBE_API_KEY: '' });
    assert.notEqual(result.status, 0, result.stderr);
    const line = result.stdout.trim().split('\n').pop() as string;
    const parsed = JSON.parse(line) as { ok: boolean; code?: string };
    assert.equal(parsed.ok, false);
    assert.equal(parsed.code, 'missing_api_key');
  } finally {
    if (had) renameSync(backup, path);
    else if (existsSync(backup)) rmSync(backup);
  }
});

test('env check: succeeds when YOUTUBE_API_KEY in .env.local', () => {
  const path = envLocalPath();
  const backup = `${path}.bak-test`;
  const had = existsSync(path);
  const prior = had ? readFileSync(path, 'utf8') : '';
  writeFileSync(path, 'YOUTUBE_API_KEY=test-smoke-key\n', { mode: 0o600 });
  try {
    const result = runTsx(ENV_CHECK, ['--mode', 'check']);
    assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
    const parsed = JSON.parse(result.stdout.trim()) as {
      ok: boolean;
      youtubeKeyConfigured?: boolean;
    };
    assert.equal(parsed.ok, true);
    assert.equal(parsed.youtubeKeyConfigured, true);
  } finally {
    if (had) writeFileSync(path, prior, { mode: 0o600 });
    else rmSync(path, { force: true });
    if (existsSync(backup)) rmSync(backup);
  }
});
