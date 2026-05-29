import type { Db } from '../db/client.ts';
import { SCORE_POLICY_VERSION, type ConsumerStage, type ScoreGrade } from '../types/youtube.ts';

export interface WorkspaceViewMeta {
  dbPath: string;
  generatedAt: string;
  schemaVersionLabel: string | null;
}

export interface WorkspaceKeywordSummary {
  id: string;
  keyword: string;
  regionCode: string;
  initialCollectionCompletedAt: string | null;
  lastSearchSessionId: string | null;
}

export interface WorkspaceSearchSessionSummary {
  id: string;
  route: string;
  query: string | null;
  mode: string | null;
  resultCount: number;
  startedAt: string;
  completedAt: string | null;
  keywordId: string | null;
}

export interface WorkspaceHotVideoSummary {
  hotDate: string;
  rank: number;
  videoId: string;
  title: string;
  channelTitle: string;
  lengthAdjustedScore: number | null;
  performanceGrade: ScoreGrade;
  contributionGrade: ScoreGrade;
}

export interface WorkspaceFolderSummary {
  id: string;
  groupId: string;
  groupName: string;
  name: string;
  consumerStage: ConsumerStage;
  videoCount: number;
}

export interface WorkspaceReferenceSummary {
  folderId: string;
  folderName: string;
  groupName: string;
  consumerStage: ConsumerStage;
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string | null;
  performanceGrade: ScoreGrade | null;
  contributionGrade: ScoreGrade | null;
  lengthAdjustedScore: number | null;
  addedAt: string;
  reason: string | null;
}

export interface WorkspaceChannelSummary {
  channelId: string;
  title: string;
  handle: string | null;
  subscriberCount: number | null;
  averageViewCount: number | null;
  videoCount: number | null;
  thumbnailUrl: string | null;
}

export interface WorkspaceVideoSummary {
  videoId: string;
  channelId: string;
  channelTitle: string;
  title: string;
  publishedAt: string | null;
  durationSec: number | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  thumbnailUrl: string | null;
  performanceGrade: ScoreGrade | null;
  contributionGrade: ScoreGrade | null;
  lengthAdjustedScore: number | null;
}

export interface WorkspaceCommentSummary {
  commentId: string;
  authorDisplayName: string | null;
  textOriginal: string;
  likeCount: number | null;
  publishedAt: string | null;
}

export interface WorkspaceViewPayload {
  meta: WorkspaceViewMeta;
  keywords: WorkspaceKeywordSummary[];
  searchSessions: WorkspaceSearchSessionSummary[];
  hotVideos: WorkspaceHotVideoSummary[];
  folders: WorkspaceFolderSummary[];
  references: WorkspaceReferenceSummary[];
  channels: WorkspaceChannelSummary[];
  videos: WorkspaceVideoSummary[];
  commentsByVideoId: Record<string, WorkspaceCommentSummary[]>;
}

export function loadWorkspaceViewPayload(db: Db, dbPath: string): WorkspaceViewPayload {
  const metaRow = db
    .prepare(`SELECT schema_version_label FROM workspace_meta WHERE id = 1`)
    .get() as { schema_version_label: string } | undefined;

  const keywords = db
    .prepare(
      `SELECT id, keyword, region_code, initial_collection_completed_at, last_search_session_id
       FROM youtube_keywords
       ORDER BY updated_at DESC`,
    )
    .all() as Array<{
      id: string;
      keyword: string;
      region_code: string;
      initial_collection_completed_at: string | null;
      last_search_session_id: string | null;
    }>;

  const searchSessions = db
    .prepare(
      `SELECT id, route, query, mode, result_count, started_at, completed_at, keyword_id
       FROM youtube_search_sessions
       ORDER BY started_at DESC
       LIMIT 100`,
    )
    .all() as Array<{
      id: string;
      route: string;
      query: string | null;
      mode: string | null;
      result_count: number;
      started_at: string;
      completed_at: string | null;
      keyword_id: string | null;
    }>;

  const hotVideos = db
    .prepare(
      `SELECT
         h.hot_date,
         h.rank,
         h.video_id,
         v.title,
         c.title AS channel_title,
         h.length_adjusted_score,
         s.performance_grade,
         s.contribution_grade
       FROM youtube_hot_videos h
       JOIN youtube_videos v ON v.video_id = h.video_id
       JOIN youtube_channels c ON c.channel_id = v.channel_id
       JOIN youtube_video_scores s
         ON s.video_id = h.video_id
        AND s.video_snapshot_collected_at = h.video_snapshot_collected_at
        AND s.policy_version = h.score_policy_version
       ORDER BY h.hot_date DESC, h.rank ASC
       LIMIT 100`,
    )
    .all() as Array<{
      hot_date: string;
      rank: number;
      video_id: string;
      title: string;
      channel_title: string;
      length_adjusted_score: number | null;
      performance_grade: ScoreGrade;
      contribution_grade: ScoreGrade;
    }>;

  const folders = db
    .prepare(
      `SELECT
         f.id,
         f.group_id,
         g.name AS group_name,
         f.name,
         f.consumer_stage,
         COUNT(rfv.video_id) AS video_count
       FROM reference_folders f
       JOIN reference_folder_groups g ON g.id = f.group_id
       LEFT JOIN reference_folder_videos rfv ON rfv.folder_id = f.id
       GROUP BY f.id
       ORDER BY g.name, f.sort_order, f.name`,
    )
    .all() as Array<{
      id: string;
      group_id: string;
      group_name: string;
      name: string;
      consumer_stage: ConsumerStage;
      video_count: number;
    }>;

  const references = db
    .prepare(
      `SELECT
         f.id AS folder_id,
         f.name AS folder_name,
         g.name AS group_name,
         rfv.consumer_stage,
         v.video_id,
         v.title,
         c.title AS channel_title,
         v.published_at,
         s.performance_grade,
         s.contribution_grade,
         s.length_adjusted_score,
         rfv.added_at,
         rfv.reason
       FROM reference_folder_videos rfv
       JOIN reference_folders f ON f.id = rfv.folder_id
       JOIN reference_folder_groups g ON g.id = f.group_id
       JOIN youtube_videos v ON v.video_id = rfv.video_id
       JOIN youtube_channels c ON c.channel_id = v.channel_id
       LEFT JOIN youtube_video_scores s
         ON s.video_id = rfv.video_id
        AND s.video_snapshot_collected_at = rfv.video_snapshot_collected_at
        AND s.policy_version = rfv.score_policy_version
       ORDER BY g.name, f.sort_order, s.length_adjusted_score DESC NULLS LAST, rfv.added_at DESC`,
    )
    .all() as Array<{
      folder_id: string;
      folder_name: string;
      group_name: string;
      consumer_stage: ConsumerStage;
      video_id: string;
      title: string;
      channel_title: string;
      published_at: string | null;
      performance_grade: ScoreGrade | null;
      contribution_grade: ScoreGrade | null;
      length_adjusted_score: number | null;
      added_at: string;
      reason: string | null;
    }>;

  const channels = db
    .prepare(
      `SELECT channel_id, title, handle, subscriber_count, average_view_count, video_count, thumbnail_url
       FROM youtube_channels
       ORDER BY collected_at DESC`,
    )
    .all() as Array<{
      channel_id: string;
      title: string;
      handle: string | null;
      subscriber_count: number | null;
      average_view_count: number | null;
      video_count: number | null;
      thumbnail_url: string | null;
    }>;

  const videos = db
    .prepare(
      `SELECT
         v.video_id,
         v.channel_id,
         c.title AS channel_title,
         v.title,
         v.published_at,
         v.duration_sec,
         v.view_count,
         v.like_count,
         v.comment_count,
         v.thumbnail_url,
         s.performance_grade,
         s.contribution_grade,
         s.length_adjusted_score
       FROM youtube_videos v
       JOIN youtube_channels c ON c.channel_id = v.channel_id
       LEFT JOIN youtube_video_scores s
         ON s.video_id = v.video_id
        AND s.policy_version = ?
        AND s.computed_at = (
          SELECT MAX(s2.computed_at)
          FROM youtube_video_scores s2
          WHERE s2.video_id = v.video_id AND s2.policy_version = ?
        )
       ORDER BY v.published_at DESC NULLS LAST, v.collected_at DESC
       LIMIT 500`,
    )
    .all(SCORE_POLICY_VERSION, SCORE_POLICY_VERSION) as Array<{
      video_id: string;
      channel_id: string;
      channel_title: string;
      title: string;
      published_at: string | null;
      duration_sec: number | null;
      view_count: number | null;
      like_count: number | null;
      comment_count: number | null;
      thumbnail_url: string | null;
      performance_grade: ScoreGrade | null;
      contribution_grade: ScoreGrade | null;
      length_adjusted_score: number | null;
    }>;

  const commentRows = db
    .prepare(
      `SELECT video_id, comment_id, author_display_name, text_original, like_count, published_at
       FROM youtube_comments
       WHERE parent_comment_id IS NULL
       ORDER BY video_id, like_count DESC, published_at DESC`,
    )
    .all() as Array<{
      video_id: string;
      comment_id: string;
      author_display_name: string | null;
      text_original: string;
      like_count: number | null;
      published_at: string | null;
    }>;

  const commentsByVideoId: Record<string, WorkspaceCommentSummary[]> = {};
  for (const row of commentRows) {
    const bucket = commentsByVideoId[row.video_id] ?? [];
    if (bucket.length >= 10) continue;
    bucket.push({
      commentId: row.comment_id,
      authorDisplayName: row.author_display_name,
      textOriginal: row.text_original,
      likeCount: row.like_count,
      publishedAt: row.published_at,
    });
    commentsByVideoId[row.video_id] = bucket;
  }

  return {
    meta: {
      dbPath,
      generatedAt: new Date().toISOString(),
      schemaVersionLabel: metaRow?.schema_version_label ?? null,
    },
    keywords: keywords.map((row) => ({
      id: row.id,
      keyword: row.keyword,
      regionCode: row.region_code,
      initialCollectionCompletedAt: row.initial_collection_completed_at,
      lastSearchSessionId: row.last_search_session_id,
    })),
    searchSessions: searchSessions.map((row) => ({
      id: row.id,
      route: row.route,
      query: row.query,
      mode: row.mode,
      resultCount: row.result_count,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      keywordId: row.keyword_id,
    })),
    hotVideos: hotVideos.map((row) => ({
      hotDate: row.hot_date,
      rank: row.rank,
      videoId: row.video_id,
      title: row.title,
      channelTitle: row.channel_title,
      lengthAdjustedScore: row.length_adjusted_score,
      performanceGrade: row.performance_grade,
      contributionGrade: row.contribution_grade,
    })),
    folders: folders.map((row) => ({
      id: row.id,
      groupId: row.group_id,
      groupName: row.group_name,
      name: row.name,
      consumerStage: row.consumer_stage,
      videoCount: row.video_count,
    })),
    references: references.map((row) => ({
      folderId: row.folder_id,
      folderName: row.folder_name,
      groupName: row.group_name,
      consumerStage: row.consumer_stage,
      videoId: row.video_id,
      title: row.title,
      channelTitle: row.channel_title,
      publishedAt: row.published_at,
      performanceGrade: row.performance_grade,
      contributionGrade: row.contribution_grade,
      lengthAdjustedScore: row.length_adjusted_score,
      addedAt: row.added_at,
      reason: row.reason,
    })),
    channels: channels.map((row) => ({
      channelId: row.channel_id,
      title: row.title,
      handle: row.handle,
      subscriberCount: row.subscriber_count,
      averageViewCount: row.average_view_count,
      videoCount: row.video_count,
      thumbnailUrl: row.thumbnail_url,
    })),
    videos: videos.map((row) => ({
      videoId: row.video_id,
      channelId: row.channel_id,
      channelTitle: row.channel_title,
      title: row.title,
      publishedAt: row.published_at,
      durationSec: row.duration_sec,
      viewCount: row.view_count,
      likeCount: row.like_count,
      commentCount: row.comment_count,
      thumbnailUrl: row.thumbnail_url,
      performanceGrade: row.performance_grade,
      contributionGrade: row.contribution_grade,
      lengthAdjustedScore: row.length_adjusted_score,
    })),
    commentsByVideoId,
  };
}

export function renderWorkspaceViewHtml(payload: WorkspaceViewPayload): string {
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>youpd workspace viewer</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #0f1115;
      --panel: #171a21;
      --text: #e8eaed;
      --muted: #9aa0a6;
      --accent: #7c9cff;
      --border: #2a2f3a;
      --good: #34a853;
      --warn: #fbbc04;
      --bad: #ea4335;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.45;
    }
    header {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem 1.25rem;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border);
      background: var(--panel);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    header h1 { margin: 0; font-size: 1.1rem; font-weight: 600; }
    header .meta { color: var(--muted); font-size: 0.85rem; }
    nav { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    nav button {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      cursor: pointer;
      font-size: 0.85rem;
    }
    nav button.active, nav button:hover { border-color: var(--accent); color: var(--accent); }
    main { padding: 1.25rem; max-width: 1200px; margin: 0 auto; }
    .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1rem;
      margin-bottom: 1rem;
    }
    .panel h2 { margin: 0 0 0.75rem; font-size: 1rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { text-align: left; padding: 0.5rem 0.4rem; border-bottom: 1px solid var(--border); vertical-align: top; }
    th { color: var(--muted); font-weight: 500; }
    tr.clickable { cursor: pointer; }
    tr.clickable:hover td { background: rgba(124, 156, 255, 0.08); }
    .badge {
      display: inline-block;
      padding: 0.1rem 0.45rem;
      border-radius: 999px;
      font-size: 0.75rem;
      border: 1px solid var(--border);
      margin-right: 0.25rem;
      white-space: nowrap;
    }
    .grade-Great, .grade-Good { border-color: var(--good); color: var(--good); }
    .grade-Normal { border-color: var(--warn); color: var(--warn); }
    .grade-Bad, .grade-Worst { border-color: var(--bad); color: var(--bad); }
    .stage { border-color: var(--accent); color: var(--accent); }
    .empty { color: var(--muted); padding: 1rem 0; }
    .detail-grid { display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .thumb { width: 180px; max-width: 100%; border-radius: 8px; border: 1px solid var(--border); }
    .comment { border-top: 1px solid var(--border); padding: 0.75rem 0; }
    .back { margin-bottom: 0.75rem; }
    .back button {
      background: transparent;
      border: none;
      color: var(--accent);
      cursor: pointer;
      padding: 0;
      font-size: 0.9rem;
    }
    a.link { color: var(--accent); text-decoration: none; }
    a.link:hover { text-decoration: underline; }
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>youpd workspace viewer</h1>
      <div class="meta" id="meta-line"></div>
    </div>
    <nav id="main-nav">
      <button type="button" data-view="search" class="active">검색</button>
      <button type="button" data-view="folders">레퍼런스</button>
      <button type="button" data-view="channels">채널</button>
    </nav>
  </header>
  <main>
    <section id="view-search"></section>
    <section id="view-folders" class="hidden"></section>
    <section id="view-channels" class="hidden"></section>
    <section id="view-channel-detail" class="hidden"></section>
    <section id="view-video-detail" class="hidden"></section>
  </main>
  <script type="application/json" id="workspace-data">${json}</script>
  <script>
    const DATA = JSON.parse(document.getElementById('workspace-data').textContent);
    const STAGE_LABELS = {
      phenomenon: '현상', desire: '욕구', plan: '계획', action: '행동', reward: '보상',
      mixed: '복합', unspecified: '미지정'
    };
    const state = { view: 'search', channelId: null, videoId: null };

    function esc(s) {
      return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
    function fmtNum(n) {
      if (n == null) return '—';
      return Number(n).toLocaleString('ko-KR');
    }
    function fmtDate(s) {
      if (!s) return '—';
      try { return new Date(s).toLocaleString('ko-KR'); } catch { return s; }
    }
    function gradeBadge(label, grade) {
      if (!grade) return '';
      return '<span class="badge grade-' + esc(grade) + '">' + esc(label) + ': ' + esc(grade) + '</span>';
    }
    function stageBadge(stage) {
      const label = STAGE_LABELS[stage] || stage;
      return '<span class="badge stage">' + esc(label) + '</span>';
    }
    function ytVideoUrl(id) { return 'https://www.youtube.com/watch?v=' + encodeURIComponent(id); }
    function ytChannelUrl(id) { return 'https://www.youtube.com/channel/' + encodeURIComponent(id); }

    function setView(view) {
      state.view = view;
      state.channelId = null;
      state.videoId = null;
      document.querySelectorAll('#main-nav button').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.view === view);
      });
      ['search','folders','channels','channel-detail','video-detail'].forEach((id) => {
        const el = document.getElementById('view-' + id);
        if (!el) return;
        const key = id.replace(/-/g, '_');
        const show = (view === 'search' && id === 'search')
          || (view === 'folders' && id === 'folders')
          || (view === 'channels' && id === 'channels')
          || (view === 'channel-detail' && id === 'channel-detail')
          || (view === 'video-detail' && id === 'video-detail');
        el.classList.toggle('hidden', !show);
      });
      render();
    }

    function openChannel(channelId) {
      state.view = 'channel-detail';
      state.channelId = channelId;
      state.videoId = null;
      document.querySelectorAll('#main-nav button').forEach((b) => b.classList.remove('active'));
      render();
    }

    function openVideo(videoId) {
      state.view = 'video-detail';
      state.videoId = videoId;
      document.querySelectorAll('#main-nav button').forEach((b) => b.classList.remove('active'));
      render();
    }

    function renderSearch() {
      const el = document.getElementById('view-search');
      const kwRows = DATA.keywords.length
        ? DATA.keywords.map((k) => '<tr class="clickable" data-session="' + esc(k.lastSearchSessionId || '') + '"><td>' + esc(k.keyword) + '</td><td>' + esc(k.regionCode) + '</td><td>' + (k.initialCollectionCompletedAt ? '완료' : '진행중') + '</td></tr>').join('')
        : '<tr><td colspan="3" class="empty">등록된 키워드가 없습니다.</td></tr>';
      const sessionRows = DATA.searchSessions.length
        ? DATA.searchSessions.map((s) => '<tr><td>' + esc(s.route) + '</td><td>' + esc(s.query || '—') + '</td><td>' + esc(s.mode || '—') + '</td><td>' + fmtNum(s.resultCount) + '</td><td>' + fmtDate(s.startedAt) + '</td></tr>').join('')
        : '<tr><td colspan="5" class="empty">검색 세션이 없습니다.</td></tr>';
      const hotRows = DATA.hotVideos.length
        ? DATA.hotVideos.map((h) => '<tr class="clickable" data-video="' + esc(h.videoId) + '"><td>' + esc(h.hotDate) + '</td><td>#' + h.rank + '</td><td>' + esc(h.title) + '</td><td>' + esc(h.channelTitle) + '</td><td>' + gradeBadge('성과', h.performanceGrade) + gradeBadge('기여', h.contributionGrade) + (h.lengthAdjustedScore != null ? '<span class="badge">점수 ' + h.lengthAdjustedScore.toFixed(2) + '</span>' : '') + '</td></tr>').join('')
        : '<tr><td colspan="5" class="empty">핫 비디오가 없습니다.</td></tr>';
      el.innerHTML = '<div class="panel"><h2>키워드</h2><table><thead><tr><th>키워드</th><th>지역</th><th>초기 수집</th></tr></thead><tbody>' + kwRows + '</tbody></table></div>'
        + '<div class="panel"><h2>최근 검색 세션</h2><table><thead><tr><th>라우트</th><th>쿼리</th><th>모드</th><th>결과</th><th>시작</th></tr></thead><tbody>' + sessionRows + '</tbody></table></div>'
        + '<div class="panel"><h2>핫 비디오</h2><table><thead><tr><th>날짜</th><th>순위</th><th>제목</th><th>채널</th><th>점수</th></tr></thead><tbody>' + hotRows + '</tbody></table></div>';
      el.querySelectorAll('tr[data-video]').forEach((row) => {
        row.addEventListener('click', () => openVideo(row.getAttribute('data-video')));
      });
    }

    function renderFolders() {
      const el = document.getElementById('view-folders');
      const folderRows = DATA.folders.length
        ? DATA.folders.map((f) => '<tr><td>' + esc(f.groupName) + '</td><td>' + esc(f.name) + '</td><td>' + stageBadge(f.consumerStage) + '</td><td>' + fmtNum(f.videoCount) + '</td></tr>').join('')
        : '<tr><td colspan="4" class="empty">레퍼런스 폴더가 없습니다.</td></tr>';
      const refRows = DATA.references.length
        ? DATA.references.map((r) => '<tr class="clickable" data-video="' + esc(r.videoId) + '"><td>' + esc(r.groupName) + ' / ' + esc(r.folderName) + '</td><td>' + esc(r.title) + '</td><td>' + esc(r.channelTitle) + '</td><td>' + stageBadge(r.consumerStage) + gradeBadge('성과', r.performanceGrade) + gradeBadge('기여', r.contributionGrade) + '</td><td>' + esc(r.reason || '') + '</td></tr>').join('')
        : '<tr><td colspan="5" class="empty">큐레이션된 레퍼런스가 없습니다.</td></tr>';
      el.innerHTML = '<div class="panel"><h2>폴더</h2><table><thead><tr><th>그룹</th><th>폴더</th><th>단계</th><th>영상 수</th></tr></thead><tbody>' + folderRows + '</tbody></table></div>'
        + '<div class="panel"><h2>레퍼런스 영상</h2><table><thead><tr><th>폴더</th><th>제목</th><th>채널</th><th>배지</th><th>사유</th></tr></thead><tbody>' + refRows + '</tbody></table></div>';
      el.querySelectorAll('tr[data-video]').forEach((row) => {
        row.addEventListener('click', () => openVideo(row.getAttribute('data-video')));
      });
    }

    function renderChannels() {
      const el = document.getElementById('view-channels');
      const rows = DATA.channels.length
        ? DATA.channels.map((c) => '<tr class="clickable" data-channel="' + esc(c.channelId) + '"><td>' + esc(c.title) + '</td><td>' + esc(c.handle || '—') + '</td><td>' + fmtNum(c.subscriberCount) + '</td><td>' + fmtNum(c.averageViewCount) + '</td><td>' + fmtNum(c.videoCount) + '</td></tr>').join('')
        : '<tr><td colspan="5" class="empty">채널이 없습니다.</td></tr>';
      el.innerHTML = '<div class="panel"><h2>채널 목록</h2><table><thead><tr><th>제목</th><th>핸들</th><th>구독자</th><th>평균 조회</th><th>영상 수</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
      el.querySelectorAll('tr[data-channel]').forEach((row) => {
        row.addEventListener('click', () => openChannel(row.getAttribute('data-channel')));
      });
    }

    function renderChannelDetail() {
      const el = document.getElementById('view-channel-detail');
      const channel = DATA.channels.find((c) => c.channelId === state.channelId);
      if (!channel) {
        el.innerHTML = '<div class="empty">채널을 찾을 수 없습니다.</div>';
        return;
      }
      const videos = DATA.videos.filter((v) => v.channelId === channel.channelId);
      const videoRows = videos.length
        ? videos.map((v) => '<tr class="clickable" data-video="' + esc(v.videoId) + '"><td>' + esc(v.title) + '</td><td>' + fmtDate(v.publishedAt) + '</td><td>' + fmtNum(v.viewCount) + '</td><td>' + gradeBadge('성과', v.performanceGrade) + gradeBadge('기여', v.contributionGrade) + '</td></tr>').join('')
        : '<tr><td colspan="4" class="empty">영상이 없습니다.</td></tr>';
      el.innerHTML = '<div class="back"><button type="button" id="back-channels">← 채널 목록</button></div>'
        + '<div class="panel"><h2>' + esc(channel.title) + '</h2><div class="detail-grid">'
        + '<div><div class="meta">핸들: ' + esc(channel.handle || '—') + '</div>'
        + '<div class="meta">구독자: ' + fmtNum(channel.subscriberCount) + '</div>'
        + '<div class="meta">평균 조회: ' + fmtNum(channel.averageViewCount) + '</div>'
        + '<div><a class="link" href="' + ytChannelUrl(channel.channelId) + '" target="_blank" rel="noopener">YouTube에서 열기</a></div></div>'
        + (channel.thumbnailUrl ? '<img class="thumb" src="' + esc(channel.thumbnailUrl) + '" alt="" />' : '')
        + '</div></div>'
        + '<div class="panel"><h2>영상</h2><table><thead><tr><th>제목</th><th>게시</th><th>조회</th><th>점수</th></tr></thead><tbody>' + videoRows + '</tbody></table></div>';
      document.getElementById('back-channels').addEventListener('click', () => setView('channels'));
      el.querySelectorAll('tr[data-video]').forEach((row) => {
        row.addEventListener('click', () => openVideo(row.getAttribute('data-video')));
      });
    }

    function renderVideoDetail() {
      const el = document.getElementById('view-video-detail');
      const video = DATA.videos.find((v) => v.videoId === state.videoId);
      if (!video) {
        el.innerHTML = '<div class="empty">영상을 찾을 수 없습니다.</div>';
        return;
      }
      const refs = DATA.references.filter((r) => r.videoId === video.videoId);
      const comments = DATA.commentsByVideoId[video.videoId] || [];
      const refList = refs.length
        ? refs.map((r) => '<li>' + esc(r.groupName) + ' / ' + esc(r.folderName) + ' ' + stageBadge(r.consumerStage) + '</li>').join('')
        : '<li class="empty">레퍼런스 폴더에 없음</li>';
      const commentBlocks = comments.length
        ? comments.map((c) => '<div class="comment"><strong>' + esc(c.authorDisplayName || '익명') + '</strong> · ' + fmtNum(c.likeCount) + ' likes<br>' + esc(c.textOriginal) + '</div>').join('')
        : '<div class="empty">저장된 댓글이 없습니다.</div>';
      el.innerHTML = '<div class="back"><button type="button" id="back-generic">← 뒤로</button></div>'
        + '<div class="panel"><h2>' + esc(video.title) + '</h2><div class="detail-grid">'
        + (video.thumbnailUrl ? '<img class="thumb" src="' + esc(video.thumbnailUrl) + '" alt="" />' : '')
        + '<div><div>채널: <button type="button" class="link" data-channel="' + esc(video.channelId) + '" style="background:none;border:none;padding:0;cursor:pointer;color:var(--accent)">' + esc(video.channelTitle) + '</button></div>'
        + '<div class="meta">게시: ' + fmtDate(video.publishedAt) + '</div>'
        + '<div class="meta">조회 ' + fmtNum(video.viewCount) + ' · 좋아요 ' + fmtNum(video.likeCount) + ' · 댓글 ' + fmtNum(video.commentCount) + '</div>'
        + '<div>' + gradeBadge('성과', video.performanceGrade) + gradeBadge('기여', video.contributionGrade)
        + (video.lengthAdjustedScore != null ? '<span class="badge">길이보정 ' + video.lengthAdjustedScore.toFixed(2) + '</span>' : '') + '</div>'
        + '<div><a class="link" href="' + ytVideoUrl(video.videoId) + '" target="_blank" rel="noopener">YouTube에서 열기</a></div></div></div></div>'
        + '<div class="panel"><h2>레퍼런스 폴더</h2><ul>' + refList + '</ul></div>'
        + '<div class="panel"><h2>댓글 (저장분)</h2>' + commentBlocks + '</div>';
      document.getElementById('back-generic').addEventListener('click', () => setView('folders'));
      el.querySelector('[data-channel]')?.addEventListener('click', (ev) => {
        openChannel(ev.currentTarget.getAttribute('data-channel'));
      });
    }

    function render() {
      document.getElementById('meta-line').textContent =
        (DATA.meta.schemaVersionLabel ? DATA.meta.schemaVersionLabel + ' · ' : '') + DATA.meta.dbPath;
      if (state.view === 'search') renderSearch();
      else if (state.view === 'folders') renderFolders();
      else if (state.view === 'channels') renderChannels();
      else if (state.view === 'channel-detail') renderChannelDetail();
      else if (state.view === 'video-detail') renderVideoDetail();
    }

    document.getElementById('main-nav').addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-view]');
      if (!btn) return;
      setView(btn.dataset.view);
    });

    render();
  </script>
</body>
</html>`;
}
