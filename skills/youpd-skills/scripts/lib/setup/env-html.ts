export interface SetupEnvHtmlOptions {
  token: string;
  port: number;
}

export function renderSetupEnvHtml(options: SetupEnvHtmlOptions): string {
  const { token, port } = options;
  const action = `http://127.0.0.1:${port}/save`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>youpd — API 키 설정</title>
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
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    main {
      width: 100%;
      max-width: 440px;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
    }
    h1 { margin: 0 0 0.5rem; font-size: 1.15rem; }
    p { margin: 0 0 1rem; color: var(--muted); font-size: 0.9rem; }
    label { display: block; font-size: 0.85rem; margin-bottom: 0.35rem; color: var(--muted); }
    input {
      width: 100%;
      padding: 0.6rem 0.75rem;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--bg);
      color: var(--text);
      font-size: 0.95rem;
      margin-bottom: 1rem;
    }
    button {
      width: 100%;
      padding: 0.65rem 1rem;
      border: none;
      border-radius: 8px;
      background: var(--accent);
      color: #0f1115;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.95rem;
    }
    button:hover { filter: brightness(1.08); }
  </style>
</head>
<body>
  <main>
    <h1>YouTube API 키</h1>
    <p>키는 이 Mac/PC의 <code>.env.local</code> 에만 저장됩니다. 외부 서버로 전송되지 않습니다.</p>
    <form method="post" action="${action}">
      <input type="hidden" name="token" value="${token}" />
      <label for="youtube">YOUTUBE_API_KEY</label>
      <input id="youtube" name="youtubeApiKey" type="password" autocomplete="off" required placeholder="AIza…" />
      <button type="submit">저장</button>
    </form>
  </main>
</body>
</html>`;
}

export function renderSetupEnvSavedHtml(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>youpd — 저장 완료</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: system-ui, sans-serif;
      background: #0f1115;
      color: #e8eaed;
    }
    main { text-align: center; padding: 2rem; }
    h1 { color: #34a853; font-size: 1.25rem; }
    p { color: #9aa0a6; }
  </style>
</head>
<body>
  <main>
    <h1>저장되었습니다</h1>
    <p>이 창을 닫고 에이전트에게 알려 주세요.</p>
  </main>
</body>
</html>`;
}
