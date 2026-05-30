import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Directory containing `SKILL.md` (self-contained skill + runtime root). */
const LIB_DIR = dirname(fileURLToPath(import.meta.url));
export const SKILL_ROOT = resolve(LIB_DIR, '..', '..');

export function skillPackageJsonPath(): string {
  return resolve(SKILL_ROOT, 'package.json');
}

export function readPackageVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(skillPackageJsonPath(), 'utf8')) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export function envLocalPath(): string {
  return resolve(SKILL_ROOT, '.env.local');
}

export function envExamplePath(): string {
  return resolve(SKILL_ROOT, '.env.example');
}

/** Load `SKILL_ROOT/.env.local` into `process.env` (does not override existing). */
export function loadSkillEnv(): void {
  const path = envLocalPath();
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

export function hasYoutubeApiKey(): boolean {
  return Boolean(process.env.YOUTUBE_API_KEY?.trim());
}
