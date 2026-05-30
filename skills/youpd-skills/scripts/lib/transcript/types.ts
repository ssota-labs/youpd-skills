export type TranscriptSource = 'youtube_captions' | 'timedtext' | 'asr_whisper' | 'manual_paste';

export interface TranscriptSegment {
  startSec: number;
  endSec: number;
  text: string;
}

export interface FetchedTranscript {
  source: TranscriptSource;
  language: string;
  fullText: string;
  segments: TranscriptSegment[];
}
