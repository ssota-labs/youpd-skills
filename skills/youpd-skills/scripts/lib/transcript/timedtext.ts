import { fail } from '../youtube/common.ts';
import type { FetchedTranscript, TranscriptSegment } from './types.ts';

const WATCH_URL = 'https://www.youtube.com/watch';
const USER_AGENT =
  'Mozilla/5.0 (compatible; youpd-skills/1.0; +https://github.com/ssota-labs/youpd-skills)';

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  kind?: string;
  name?: { simpleText?: string };
}

function pickTrack(tracks: CaptionTrack[], langPrefs: string[]): CaptionTrack | undefined {
  for (const pref of langPrefs) {
    const exact = tracks.find((t) => t.languageCode === pref || t.languageCode.startsWith(`${pref}-`));
    if (exact) return exact;
  }
  return tracks[0];
}

function extractCaptionTracks(html: string): CaptionTrack[] {
  const marker = '"captionTracks":';
  const idx = html.indexOf(marker);
  if (idx === -1) return [];

  const start = html.indexOf('[', idx);
  if (start === -1) return [];

  let depth = 0;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) {
        const json = html.slice(start, i + 1);
        try {
          return JSON.parse(json) as CaptionTrack[];
        } catch {
          return [];
        }
      }
    }
  }
  return [];
}

export function parseJson3(body: string): TranscriptSegment[] {
  const data = JSON.parse(body) as { events?: Array<{ tStartMs?: number; dDurationMs?: number; segs?: Array<{ utf8?: string }> }> };
  const segments: TranscriptSegment[] = [];
  for (const event of data.events ?? []) {
    const text = (event.segs ?? []).map((s) => s.utf8 ?? '').join('').trim();
    if (!text) continue;
    const startMs = event.tStartMs ?? 0;
    const durMs = event.dDurationMs ?? 0;
    const startSec = startMs / 1000;
    const endSec = startSec + durMs / 1000;
    segments.push({ startSec, endSec: endSec > startSec ? endSec : startSec + 0.5, text });
  }
  return segments;
}

function parseSrv3Xml(body: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const re = /<text start="([^"]+)"[^>]*dur="([^"]*)"[^>]*>([^<]*)<\/text>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    const startSec = Number.parseFloat(match[1] ?? '0');
    const durSec = Number.parseFloat(match[2] ?? '0');
    const raw = match[3] ?? '';
    const text = decodeXmlEntities(raw).trim();
    if (!text) continue;
    segments.push({
      startSec,
      endSec: startSec + (Number.isFinite(durSec) && durSec > 0 ? durSec : 0.5),
      text,
    });
  }
  return segments;
}

function decodeXmlEntities(s: string): string {
  return s
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&#39;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('\n', ' ');
}

async function downloadTrack(track: CaptionTrack): Promise<TranscriptSegment[]> {
  const jsonUrl = track.baseUrl.includes('?')
    ? `${track.baseUrl}&fmt=json3`
    : `${track.baseUrl}?fmt=json3`;

  const jsonRes = await fetch(jsonUrl, { headers: { 'User-Agent': USER_AGENT } });
  if (jsonRes.ok) {
    const body = await jsonRes.text();
    if (body.trim().startsWith('{')) {
      const segments = parseJson3(body);
      if (segments.length > 0) return segments;
    }
  }

  const xmlRes = await fetch(track.baseUrl, { headers: { 'User-Agent': USER_AGENT } });
  if (!xmlRes.ok) {
    fail('network_error', `자막 트랙 다운로드 실패 (HTTP ${xmlRes.status})`, { url: track.baseUrl });
  }
  const xml = await xmlRes.text();
  const segments = parseSrv3Xml(xml);
  if (segments.length === 0) {
    fail('not_found', '자막 트랙을 받았지만 파싱할 세그먼트가 없습니다.', { url: track.baseUrl });
  }
  return segments;
}

export async function fetchTimedtextTranscript(
  videoId: string,
  langPrefs: string[],
): Promise<FetchedTranscript> {
  const watchRes = await fetch(`${WATCH_URL}?v=${encodeURIComponent(videoId)}`, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': langPrefs.join(',') },
  });
  if (!watchRes.ok) {
    fail('network_error', `YouTube watch 페이지 요청 실패 (HTTP ${watchRes.status})`, { videoId });
  }

  const html = await watchRes.text();
  const tracks = extractCaptionTracks(html);
  if (tracks.length === 0) {
    fail('not_found', '공개 자막 트랙이 없습니다. ASR 은 --allow-asr 로 명시 승인 후 시도하세요.', {
      videoId,
      code: 'captions_unavailable',
    });
  }

  const track = pickTrack(tracks, langPrefs);
  if (!track) {
    fail('not_found', '사용 가능한 자막 트랙을 선택하지 못했습니다.', { videoId });
  }

  const segments = await downloadTrack(track);
  const fullText = segments.map((s) => s.text).join(' ').trim();
  if (fullText.length === 0) {
    fail('not_found', '자막 본문이 비어 있습니다.', { videoId });
  }

  return {
    source: 'timedtext',
    language: track.languageCode,
    fullText,
    segments,
  };
}
