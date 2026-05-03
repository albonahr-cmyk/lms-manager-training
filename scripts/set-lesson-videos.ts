/**
 * Lesson の videoUrl を一括差し替え + duration を YouTube から自動取得する。
 *
 * 使い方:
 *   pnpm exec tsx scripts/set-lesson-videos.ts <URL1> [URL2] [URL3] ...
 *
 *   - 引数の URL を Lesson テーブルの order 順で割り当てる
 *   - 引数が Lesson 数より少ない場合は最後の URL を残りに当てる
 *   - 各 URL の長さは fetchYouTubeMeta で自動取得 (失敗時は既存値を保持)
 */

import { PrismaClient } from "@prisma/client";
import { isValidVideoUrl, parseVideoSource } from "../src/lib/video-source";
import { fetchYouTubeMeta } from "../src/lib/youtube-meta";

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      "Usage: pnpm exec tsx scripts/set-lesson-videos.ts <URL1> [URL2] ...",
    );
    process.exit(1);
  }

  for (const url of args) {
    if (!isValidVideoUrl(url)) {
      console.error(`✗ 無効な URL: ${url}`);
      process.exit(2);
    }
  }

  const prisma = new PrismaClient();
  try {
    const lessons = await prisma.lesson.findMany({
      orderBy: [{ courseId: "asc" }, { order: "asc" }],
      select: { id: true, title: true, durationSec: true },
    });

    if (lessons.length === 0) {
      console.log("Lesson が 1 件もありません。");
      return;
    }

    console.log(`Lesson ${lessons.length} 件 / 引数 URL ${args.length} 件`);
    const metaCache = new Map<string, number | null>();

    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i];
      const url = args[Math.min(i, args.length - 1)];
      const source = parseVideoSource(url)!;

      let durationSec = lesson.durationSec;
      if (source.type === "YOUTUBE") {
        if (!metaCache.has(url)) {
          process.stdout.write(`  ↳ fetching duration: ${url} ... `);
          const meta = await fetchYouTubeMeta(url);
          metaCache.set(url, meta?.durationSec ?? null);
          console.log(meta?.durationSec ? `${meta.durationSec}s` : "FAILED");
        }
        const fetched = metaCache.get(url);
        if (typeof fetched === "number") durationSec = fetched;
      }

      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { videoUrl: url, durationSec },
      });
      console.log(
        `✓ [${i + 1}/${lessons.length}] ${lesson.title}  →  ${url}  (${durationSec}s)`,
      );
    }

    console.log("完了。");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
