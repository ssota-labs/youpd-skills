import type { ScoreGrade } from '../types/youtube.ts';
import { SCORE_POLICY_VERSION } from '../types/youtube.ts';

export interface ScoreSnapshotInputs {
  videoId: string;
  channelId: string;
  videoViewCount: number | null;
  channelSubscriberCount: number | null;
  channelAverageViewCount: number | null;
  durationSec: number | null;
  videoSnapshotCollectedAt: string;
  channelSnapshotCollectedAt: string;
}

export interface ComputedScore {
  policyVersion: string;
  performanceRatio: number | null;
  performanceGrade: ScoreGrade;
  contributionRatio: number | null;
  contributionGrade: ScoreGrade;
  lengthWeight: number;
  lengthAdjustedScore: number | null;
  inputsJson: string;
}

export function computeAverageViewCount(
  totalViewCount: number | null,
  videoCount: number | null,
): number | null {
  if (totalViewCount == null || videoCount == null || videoCount <= 0) return null;
  return totalViewCount / videoCount;
}

export function ratioGrade(ratio: number | null): ScoreGrade {
  if (ratio == null || !Number.isFinite(ratio)) return 'Unknown';
  if (ratio < 0.1) return 'Worst';
  if (ratio < 1) return 'Bad';
  if (ratio < 10) return 'Normal';
  if (ratio < 100) return 'Good';
  return 'Great';
}

export function computeLengthWeight(durationSec: number | null): number {
  if (durationSec == null || durationSec <= 0) return 1;
  const numerator = Math.log(1 + 600);
  const denominator = Math.log(1 + durationSec);
  if (!Number.isFinite(denominator) || denominator === 0) return 1;
  return clamp(numerator / denominator, 0.5, 2);
}

export function computeScore(inputs: ScoreSnapshotInputs): ComputedScore {
  const performanceRatio =
    inputs.videoViewCount != null &&
    inputs.channelSubscriberCount != null &&
    inputs.channelSubscriberCount > 0
      ? inputs.videoViewCount / inputs.channelSubscriberCount
      : null;

  const contributionRatio =
    inputs.videoViewCount != null &&
    inputs.channelAverageViewCount != null &&
    inputs.channelAverageViewCount > 0
      ? inputs.videoViewCount / inputs.channelAverageViewCount
      : null;

  const performanceGrade = ratioGrade(performanceRatio);
  const contributionGrade = ratioGrade(contributionRatio);

  const lengthWeight = computeLengthWeight(inputs.durationSec);

  let lengthAdjustedScore: number | null = null;
  if (
    performanceRatio != null &&
    contributionRatio != null &&
    performanceRatio >= 0 &&
    contributionRatio >= 0
  ) {
    lengthAdjustedScore = Math.sqrt(performanceRatio * contributionRatio) * lengthWeight;
  }

  return {
    policyVersion: SCORE_POLICY_VERSION,
    performanceRatio,
    performanceGrade,
    contributionRatio,
    contributionGrade,
    lengthWeight,
    lengthAdjustedScore,
    inputsJson: JSON.stringify({
      videoId: inputs.videoId,
      channelId: inputs.channelId,
      videoViewCount: inputs.videoViewCount,
      channelSubscriberCount: inputs.channelSubscriberCount,
      channelAverageViewCount: inputs.channelAverageViewCount,
      durationSec: inputs.durationSec,
      videoSnapshotCollectedAt: inputs.videoSnapshotCollectedAt,
      channelSnapshotCollectedAt: inputs.channelSnapshotCollectedAt,
    }),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
