import { z } from 'zod';

export type TranscriptSource = 'youtube_captions' | 'timedtext' | 'asr_whisper' | 'manual_paste';

export const TranscriptSourceSchema = z.enum([
  'youtube_captions',
  'timedtext',
  'asr_whisper',
  'manual_paste',
]);

export type FetchTranscriptItem = {
  videoId: string;
  source: TranscriptSource;
  language: string;
  replaced: boolean;
  segmentCount: number;
  charCount: number;
};

export type FetchTranscriptFailure = {
  videoId: string;
  message: string;
  code: string;
};

export type FetchTranscriptResult = {
  succeeded: number;
  failed: number;
  items: FetchTranscriptItem[];
  failures: FetchTranscriptFailure[];
};
