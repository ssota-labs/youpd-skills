import { z } from 'zod';

/**
 * Cross-platform workspace tables. These are the pure TypeScript shapes that
 * mirror the SQL columns 1:1; conversion (e.g. ISO strings) is the caller's
 * responsibility. Zod schemas validate untrusted input at SKILL boundaries.
 */

export interface SchemaMigrationRow {
  filename: string;
  applied_at: string;
}

export const SchemaMigrationRowSchema = z.object({
  filename: z.string(),
  applied_at: z.string(),
});

export interface WorkspaceMetaRow {
  id: 1;
  created_at: string;
  schema_version_label: string;
}

export const WorkspaceMetaRowSchema = z.object({
  id: z.literal(1),
  created_at: z.string(),
  schema_version_label: z.string().min(1),
});

/** Init result emitted by `scripts/workspace/init.ts`. */
export interface WorkspaceInitOk {
  ok: true;
  dbPath: string;
  created: boolean;
  appliedMigrations: string[];
  totalLedgerCount: number;
  schemaVersionLabel: string;
  workspaceMetaCreated: boolean;
}

export type WorkspaceInitErrorCode =
  | 'NODE_VERSION'
  | 'DB_DIR_DENIED'
  | 'MIGRATION_FAILED'
  | 'UNKNOWN';

export interface WorkspaceInitError {
  ok: false;
  code: WorkspaceInitErrorCode;
  message: string;
  detail?: unknown;
}

export type WorkspaceInitResult = WorkspaceInitOk | WorkspaceInitError;
