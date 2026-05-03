/**
 * YouTube メタデータ取得 (API キー不要 / 公開動画のみ)
 *
 * watch ページの HTML から ytInitialPlayerResponse を抽出して
 * lengthSeconds と title を取り出す。失敗時は null を返す。
 *
 * 用途:
 *  - 管理画面で YouTube URL を保存したときの durationSec 自動補完
 *  - seed バックフィルスクリプト
 *
 * 注意:
 *  - 限定公開 / 年齢制限 / 地域ブロックされた動画では取得失敗する
 *  - YouTube の HTML 構造変更で壊れる可能性があるため、失敗時はユーザー入力を尊重する
 */

import { parseVideoSource } from "./video-source";

export type YouTubeMeta = {
  videoId: string;
  durationSec: number;
  title: string;
};

const FETCH_TIMEOUT_MS = 8_000;

/** ytInitialPlayerResponse から JSON を抜き出す。安定した順序で複数パターンを試す。 */
function extractPlayerResponse(html: string): unknown | null {
  // パターン 1: var ytInitialPlayerResponse = {...};
  const m1 = html.match(/var ytInitialPlayerResponse\s*=\s*(\{[\s\S]*?\});/);
  if (m1) {
    try {
      return JSON.parse(m1[1]);
    } catch {
      // fallthrough
    }
  }
  // パターン 2: ytInitialPlayerResponse = {...};
  const m2 = html.match(/ytInitialPlayerResponse"?\s*[:=]\s*(\{[\s\S]*?\})\s*[,;]/);
  if (m2) {
    try {
      return JSON.parse(m2[1]);
    } catch {
      // fallthrough
    }
  }
  return null;
}

function getString(obj: unknown, path: readonly string[]): string | null {
  let cur: unknown = obj;
  for (const key of path) {
    if (cur === null || typeof cur !== "object") return null;
    cur = (cur as Record<string, unknown>)[key];
  }
  return typeof cur === "string" ? cur : null;
}

/**
 * 任意の YouTube URL からメタデータを取得する。
 * 不正 URL / 取得失敗 / パース失敗 → null
 */
export async function fetchYouTubeMeta(
  url: string,
): Promise<YouTubeMeta | null> {
  const source = parseVideoSource(url);
  if (!source || source.type !== "YOUTUBE") return null;
  const videoId = source.videoId;

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}&hl=en`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  let html: string;
  try {
    const res = await fetch(watchUrl, {
      signal: ctrl.signal,
      headers: {
        // 通常のブラウザ UA を装う (一部レスポンスがモバイル簡易版になるのを避ける)
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return null;
    html = await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }

  const player = extractPlayerResponse(html);
  if (!player) return null;

  const lengthRaw = getString(player, ["videoDetails", "lengthSeconds"]);
  const title = getString(player, ["videoDetails", "title"]) ?? "";
  if (!lengthRaw) return null;
  const durationSec = Number.parseInt(lengthRaw, 10);
  if (!Number.isFinite(durationSec) || durationSec <= 0) return null;

  return { videoId, durationSec, title };
}
