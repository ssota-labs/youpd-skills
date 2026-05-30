import { z } from 'zod';

export type AnalysisKind = 'title' | 'thumbnail' | 'intro';

export const AnalysisKindSchema = z.enum(['title', 'thumbnail', 'intro']);

export type AnalysisCandidateItem = {
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  folderIds: string[];
  hasTitleAnalysis: boolean;
  hasThumbnailAnalysis: boolean;
  hasIntroAnalysis: boolean;
  hasTranscript: boolean;
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

export type SaveIntroAnalysisResult = {
  videoId: string;
  analysisId: string;
  reanalyzed: boolean;
  hasTranscript: boolean;
};

export const SaveIntroAnalysisInputSchema = z.object({
  videoId: z.string().min(1),
  windowSec: z.number().int().positive(),
  introHookPrimary: z.string().min(1),
  introHookSecondary: z.string().min(1).optional(),
  introStructure: z.string().min(1),
  pacingSignal: z.string().min(1),
  rewardBurdenBalance: z.string().min(1),
  reasoning: z.string().min(1),
  freeTags: z.array(z.string().min(1)).default([]),
  reanalyze: z.boolean().default(false),
});

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
