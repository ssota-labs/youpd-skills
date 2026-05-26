import { z } from 'zod';

export type GlossaryAxisScope = 'global' | 'platform';

export interface GlossaryAxisRow {
  id: string;
  name: string;
  scope: GlossaryAxisScope;
  platform_key: string | null;
  description: string | null;
  created_at: string;
}

export const GlossaryAxisRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  scope: z.enum(['global', 'platform']),
  platform_key: z.string().nullable(),
  description: z.string().nullable(),
  created_at: z.string(),
});

export interface GlossaryAxisValueRow {
  id: string;
  axis_id: string;
  code: string;
  label: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export const GlossaryAxisValueRowSchema = z.object({
  id: z.string().uuid(),
  axis_id: z.string().uuid(),
  code: z.string().min(1),
  label: z.string().min(1),
  description: z.string().nullable(),
  sort_order: z.number().int(),
  created_at: z.string(),
});

export interface GlossaryTagRow {
  id: string;
  label: string;
  created_at: string;
}

export const GlossaryTagRowSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1),
  created_at: z.string(),
});
