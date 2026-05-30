import { z } from 'zod';

export type AnalysisKind = 'title' | 'thumbnail';

export const AnalysisKindSchema = z.enum(['title', 'thumbnail']);

export type AnalysisCandidateItem = {
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  folderIds: string[];
  hasTitleAnalysis: boolean;
  hasThumbnailAnalysis: boolean;
};

export type ListAnalysisCandidatesResult = {
  kind: AnalysisKind;
  candidates: AnalysisCandidateItem[];
};

export type SaveTitleAnalysisResult = {
  videoId: string;
  analysisId: string;
  reanalyzed: boolean;
};

export type SaveThumbnailAnalysisResult = {
  videoId: string;
  analysisId: string;
  reanalyzed: boolean;
  hasTitleAnalysis: boolean;
};

export type DbExecResult = {
  rows: Record<string, unknown>[];
  changes: number;
  lastInsertRowid: number | bigint;
};

export const SaveTitleAnalysisInputSchema = z.object({
  videoId: z.string().min(1),
  hookPrimary: z.string().min(1),
  hookSecondary: z.string().min(1).optional(),
  titleShapes: z.array(z.string().min(1)).default([]),
  titleTone: z.string().min(1),
  reasoning: z.string().min(1),
  freeTags: z.array(z.string().min(1)).default([]),
  reanalyze: z.boolean().default(false),
});

export const SaveThumbnailAnalysisInputSchema = z.object({
  videoId: z.string().min(1),
  visualHierarchy: z.string().min(1),
  textDensity: z.string().min(1),
  faceTreatment: z.string().min(1).optional(),
  feltEmotion: z.string().min(1),
  alignmentWithTitle: z.string().min(1).optional(),
  alignmentReasoning: z.string().min(1).optional(),
  reasoning: z.string().min(1),
  freeTags: z.array(z.string().min(1)).default([]),
  thumbnailUrlUsed: z.string().url().optional(),
  reanalyze: z.boolean().default(false),
});
