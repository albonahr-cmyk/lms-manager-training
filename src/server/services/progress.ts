import { prisma } from "@/server/repositories/db";
import { container } from "@/server/container";

const DEFAULT_COMPLETION_RATE = 0.95;

export type UpsertProgressResult = {
  completed: boolean;
};

/**
 * Lesson の進捗を upsert する。
 * 完了判定: watchedSec / durationSec >= (lesson.requiredCompletionRate ?? 0.95)
 *
 * 早送り抑止判定はここでは行わない (Route Handler 側で実施)。
 */
export async function upsertProgress(
  userId: string,
  lessonId: string,
  watchedSec: number,
  lastPositionSec: number,
): Promise<UpsertProgressResult> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      durationSec: true,
      requiredCompletionRate: true,
    },
  });
  if (!lesson) {
    throw new Error(`Lesson not found: ${lessonId}`);
  }

  // 既存 progress を取得 (watchedSec を後退させない)
  const existing = await prisma.progress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
    select: {
      watchedSec: true,
      lastPositionSec: true,
      completed: true,
    },
  });

  // watchedSec は単調増加 (後退禁止)
  const newWatched = Math.max(existing?.watchedSec ?? 0, watchedSec);
  const newLastPosition = Math.max(0, lastPositionSec);

  const rate = lesson.requiredCompletionRate ?? DEFAULT_COMPLETION_RATE;
  const ratio =
    lesson.durationSec > 0 ? newWatched / lesson.durationSec : 0;
  const completed =
    existing?.completed === true ? true : ratio >= rate;
  const completedAt =
    completed && existing?.completed !== true ? new Date() : undefined;

  await prisma.progress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: {
      userId,
      lessonId,
      watchedSec: newWatched,
      lastPositionSec: newLastPosition,
      completed,
      completedAt: completed ? new Date() : null,
    },
    update: {
      watchedSec: newWatched,
      lastPositionSec: newLastPosition,
      ...(completed && existing?.completed !== true
        ? { completed: true, completedAt: completedAt ?? new Date() }
        : {}),
    },
  });

  if (completed && existing?.completed !== true) {
    container.logger.info("progress.completed", { userId, lessonId });
  }

  return { completed };
}

export type CourseProgressItem = {
  lessonId: string;
  watchedSec: number;
  lastPositionSec: number;
  completed: boolean;
};

export type CourseProgressSummary = {
  totalLessons: number;
  completedLessons: number;
  percent: number;
  items: CourseProgressItem[];
};

/**
 * Course 単位の進捗集計を返す (一覧画面で使用)。
 */
export async function getCourseProgress(
  userId: string,
  courseId: string,
): Promise<CourseProgressSummary> {
  const lessons = await prisma.lesson.findMany({
    where: { courseId },
    select: { id: true },
    orderBy: { order: "asc" },
  });
  const lessonIds = lessons.map((l) => l.id);

  const progresses =
    lessonIds.length > 0
      ? await prisma.progress.findMany({
          where: { userId, lessonId: { in: lessonIds } },
          select: {
            lessonId: true,
            watchedSec: true,
            lastPositionSec: true,
            completed: true,
          },
        })
      : [];

  const map = new Map(progresses.map((p) => [p.lessonId, p]));
  const items: CourseProgressItem[] = lessons.map((l) => {
    const p = map.get(l.id);
    return {
      lessonId: l.id,
      watchedSec: p?.watchedSec ?? 0,
      lastPositionSec: p?.lastPositionSec ?? 0,
      completed: p?.completed ?? false,
    };
  });

  const completedLessons = items.filter((i) => i.completed).length;
  const totalLessons = items.length;
  const percent =
    totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

  return { totalLessons, completedLessons, percent, items };
}
