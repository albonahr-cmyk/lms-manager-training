import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { prisma } from "@/server/repositories/db";
import { upsertProgress } from "@/server/services/progress";
import { ok, err } from "@/lib/result";
import { container } from "@/server/container";

const SEEK_TOLERANCE_SEC = 5;

const BodySchema = z.object({
  lessonId: z.string().min(1),
  watchedSec: z.number().int().min(0),
  lastPositionSec: z.number().int().min(0),
});

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json(err("UNAUTHENTICATED", "ログインしてください。"), {
      status: 401,
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      err("VALIDATION_FAILED", "JSON ボディを解析できません。"),
      { status: 400 },
    );
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      err("VALIDATION_FAILED", "入力値が不正です。"),
      { status: 400 },
    );
  }
  const { lessonId, watchedSec, lastPositionSec } = parsed.data;

  // Lesson 取得 (blockSeek 判定用)
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, courseId: true, blockSeek: true },
  });
  if (!lesson) {
    return NextResponse.json(
      err("NOT_FOUND", "レッスンが見つかりません。"),
      { status: 404 },
    );
  }

  // Enrollment チェック (受講者がそのコースに割当されているか)
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: lesson.courseId } },
    select: { id: true },
  });
  if (!enrollment && user.role !== "ADMIN") {
    return NextResponse.json(
      err("FORBIDDEN", "このレッスンを視聴する権限がありません。"),
      { status: 403 },
    );
  }

  // 早送り抑止
  if (lesson.blockSeek) {
    const existing = await prisma.progress.findUnique({
      where: { userId_lessonId: { userId: user.id, lessonId } },
      select: { lastPositionSec: true },
    });
    const previous = existing?.lastPositionSec ?? 0;
    if (lastPositionSec > previous + SEEK_TOLERANCE_SEC) {
      container.logger.warn("progress.seek_blocked", {
        userId: user.id,
        lessonId,
        previous,
        attempted: lastPositionSec,
      });
      return NextResponse.json(
        err("SEEK_BLOCKED", "前方シークは禁止されています。"),
        { status: 422 },
      );
    }
  }

  try {
    const result = await upsertProgress(
      user.id,
      lessonId,
      watchedSec,
      lastPositionSec,
    );
    return NextResponse.json(ok({ completed: result.completed }));
  } catch (e) {
    const message = e instanceof Error ? e.message : "internal";
    container.logger.error("progress.upsert.failed", { message });
    return NextResponse.json(err("INTERNAL", "進捗の保存に失敗しました。"), {
      status: 500,
    });
  }
}
