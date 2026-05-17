"use server";

import { z } from "zod";
import { prisma } from "@/server/repositories/db";
import { requireAdmin } from "@/server/auth";
import { container } from "@/server/container";

// CSV列: episode_no, chapter_no, chapter_name, in_chapter_no, title, URL, is_merged, merge_source
const ROW_SCHEMA = z.object({
  title: z.string().min(1),
  videoUrl: z.string().default(""),
  order: z.number().int().min(0),
});

export type ImportLessonsResult =
  | { ok: true; imported: number; skipped: number }
  | { ok: false; error: string };

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function detectColumns(header: string[]): {
  titleIdx: number;
  urlIdx: number;
  orderIdx: number;
} | null {
  const h = header.map((s) => s.toLowerCase().replace(/[_\s]/g, ""));
  const titleIdx = h.findIndex((s) => s === "title" || s === "タイトル");
  const urlIdx = h.findIndex((s) => s === "url" || s === "動画url" || s === "videourl");
  // in_chapter_no を優先、なければ episode_no
  const orderIdx =
    h.findIndex((s) => s === "inchapterno") !== -1
      ? h.findIndex((s) => s === "inchapterno")
      : h.findIndex((s) => s === "episodeno" || s === "no" || s === "order");

  if (titleIdx === -1) return null;
  return { titleIdx, urlIdx, orderIdx };
}

export async function importLessonsFromCsv(
  courseId: string,
  csvText: string,
): Promise<ImportLessonsResult> {
  await requireAdmin();

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { ok: false, error: "CSVにデータ行がありません。" };
  }

  const header = parseCsvLine(lines[0]!);
  const cols = detectColumns(header);
  if (!cols) {
    return {
      ok: false,
      error: `CSVのヘッダーに "title" 列が見つかりません。ヘッダー: ${header.join(", ")}`,
    };
  }

  // コースの存在確認
  const course = await container.cms.getCourse(courseId);
  if (!course) {
    return { ok: false, error: "コースが見つかりません。" };
  }

  const rows: { title: string; videoUrl: string; order: number }[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]!);
    const rawTitle = cells[cols.titleIdx] ?? "";
    const rawUrl = cols.urlIdx >= 0 ? (cells[cols.urlIdx] ?? "") : "";
    const rawOrder = cols.orderIdx >= 0 ? (cells[cols.orderIdx] ?? "") : String(i);

    const parsed = ROW_SCHEMA.safeParse({
      title: rawTitle,
      videoUrl: rawUrl,
      order: Number(rawOrder) || i,
    });

    if (!parsed.success || !parsed.data.title) {
      skipped++;
      continue;
    }
    rows.push(parsed.data);
  }

  if (rows.length === 0) {
    return { ok: false, error: "有効なレッスン行がありませんでした。" };
  }

  // 既存のDBレッスンを削除してから再インポート（このコースのみ）
  await prisma.lesson.deleteMany({ where: { courseId } });

  await prisma.lesson.createMany({
    data: rows.map((r) => ({
      courseId,
      title: r.title,
      videoUrl: r.videoUrl,
      order: r.order,
    })),
  });

  container.logger.info("admin.import_lessons.done", {
    courseId,
    imported: rows.length,
    skipped,
  });

  return { ok: true, imported: rows.length, skipped };
}
