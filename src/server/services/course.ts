import { prisma } from "@/server/repositories/db";
import { container } from "@/server/container";
import { AppError } from "@/lib/errors";

export type CreateCourseInput = {
  title: string;
  description: string;
  order: number;
};

export async function createCourse(
  actorId: string,
  input: CreateCourseInput,
): Promise<{ courseId: string }> {
  if (input.title.trim().length === 0) {
    throw new AppError("VALIDATION_FAILED", "タイトルを入力してください。", 422);
  }
  const course = await prisma.course.create({
    data: {
      title: input.title.trim(),
      description: input.description.trim(),
      order: input.order,
    },
    select: { id: true },
  });
  await container.audit.write({
    actorId,
    action: "COURSE_CREATE",
    target: `Course:${course.id}`,
    diff: input,
  });
  return { courseId: course.id };
}

export type UpdateCourseInput = {
  id: string;
  title?: string;
  description?: string;
  order?: number;
};

export async function updateCourse(
  actorId: string,
  input: UpdateCourseInput,
): Promise<void> {
  const before = await prisma.course.findUnique({
    where: { id: input.id },
    select: { id: true, title: true, description: true, order: true },
  });
  if (!before) {
    throw new AppError("NOT_FOUND", "コースが見つかりません。", 404);
  }
  await prisma.course.update({
    where: { id: input.id },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description.trim() }
        : {}),
      ...(input.order !== undefined ? { order: input.order } : {}),
    },
  });
  await container.audit.write({
    actorId,
    action: "COURSE_UPDATE",
    target: `Course:${input.id}`,
    diff: { before, after: input },
  });
}

export async function publishCourse(
  actorId: string,
  id: string,
  published: boolean,
): Promise<void> {
  const before = await prisma.course.findUnique({
    where: { id },
    select: { id: true, published: true },
  });
  if (!before) {
    throw new AppError("NOT_FOUND", "コースが見つかりません。", 404);
  }
  await prisma.course.update({ where: { id }, data: { published } });
  await container.audit.write({
    actorId,
    action: "COURSE_PUBLISH",
    target: `Course:${id}`,
    diff: { from: before.published, to: published },
  });
}

// ---------- Lesson ----------

export type CreateLessonInput = {
  courseId: string;
  title: string;
  videoUrl?: string;
  durationSec: number;
  order: number;
  blockSeek?: boolean;
  requiredCompletionRate?: number | null;
  description?: string;
};

export async function createLesson(
  actorId: string,
  input: CreateLessonInput,
): Promise<{ lessonId: string }> {
  if (input.title.trim().length === 0) {
    throw new AppError("VALIDATION_FAILED", "タイトルを入力してください。", 422);
  }
  if (input.durationSec < 0) {
    throw new AppError("VALIDATION_FAILED", "再生時間は 0 以上で指定してください。", 422);
  }
  const course = await prisma.course.findUnique({
    where: { id: input.courseId },
    select: { id: true },
  });
  if (!course) {
    throw new AppError("NOT_FOUND", "コースが見つかりません。", 404);
  }
  const lesson = await prisma.lesson.create({
    data: {
      courseId: input.courseId,
      title: input.title.trim(),
      description: (input.description ?? "").trim(),
      videoUrl: input.videoUrl ?? "/sample.mp4",
      durationSec: input.durationSec,
      order: input.order,
      blockSeek: input.blockSeek ?? false,
      requiredCompletionRate: input.requiredCompletionRate ?? null,
    },
    select: { id: true },
  });
  await container.audit.write({
    actorId,
    action: "LESSON_CREATE",
    target: `Lesson:${lesson.id}`,
    diff: input,
  });
  return { lessonId: lesson.id };
}

export type UpdateLessonInput = {
  id: string;
  title?: string;
  description?: string;
  videoUrl?: string;
  durationSec?: number;
  order?: number;
  blockSeek?: boolean;
  requiredCompletionRate?: number | null;
};

export async function updateLesson(
  actorId: string,
  input: UpdateLessonInput,
): Promise<void> {
  const before = await prisma.lesson.findUnique({
    where: { id: input.id },
  });
  if (!before) {
    throw new AppError("NOT_FOUND", "レッスンが見つかりません。", 404);
  }
  await prisma.lesson.update({
    where: { id: input.id },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description.trim() }
        : {}),
      ...(input.videoUrl !== undefined ? { videoUrl: input.videoUrl } : {}),
      ...(input.durationSec !== undefined
        ? { durationSec: input.durationSec }
        : {}),
      ...(input.order !== undefined ? { order: input.order } : {}),
      ...(input.blockSeek !== undefined ? { blockSeek: input.blockSeek } : {}),
      ...(input.requiredCompletionRate !== undefined
        ? { requiredCompletionRate: input.requiredCompletionRate }
        : {}),
    },
  });
  await container.audit.write({
    actorId,
    action: "LESSON_UPDATE",
    target: `Lesson:${input.id}`,
    diff: { before, after: input },
  });
}

export async function deleteLesson(
  actorId: string,
  id: string,
): Promise<void> {
  const before = await prisma.lesson.findUnique({
    where: { id },
    select: { id: true, courseId: true, title: true },
  });
  if (!before) {
    throw new AppError("NOT_FOUND", "レッスンが見つかりません。", 404);
  }
  await prisma.lesson.delete({ where: { id } });
  await container.audit.write({
    actorId,
    action: "LESSON_DELETE",
    target: `Lesson:${id}`,
    diff: before,
  });
}

// ---------- Enrollment ----------

export async function assignCourse(
  actorId: string,
  input: { userIds: string[]; courseId: string; dueAt?: Date | null },
): Promise<{ assigned: number }> {
  const course = await prisma.course.findUnique({
    where: { id: input.courseId },
    select: { id: true, title: true },
  });
  if (!course) {
    throw new AppError("NOT_FOUND", "コースが見つかりません。", 404);
  }
  const users = await prisma.user.findMany({
    where: { id: { in: input.userIds }, deactivated: false },
    select: { id: true, email: true, name: true },
  });
  if (users.length === 0) {
    return { assigned: 0 };
  }

  let assigned = 0;
  for (const u of users) {
    try {
      await prisma.enrollment.create({
        data: {
          userId: u.id,
          courseId: input.courseId,
          dueAt: input.dueAt ?? null,
        },
      });
      assigned++;
      await container.audit.write({
        actorId,
        action: "ENROLLMENT_CREATE",
        target: `Enrollment:${u.id}:${input.courseId}`,
        diff: { userId: u.id, courseId: input.courseId, dueAt: input.dueAt ?? null },
      });
      await container.mail.send(
        u.email,
        `[LMS] 「${course.title}」が割り当てられました`,
        `${u.name} さん、研修コース「${course.title}」が割り当てられました。${
          input.dueAt
            ? `期限: ${input.dueAt.toISOString().slice(0, 10)} まで`
            : "期限の指定はありません。"
        }`,
      );
    } catch {
      // P2002 (既割当) は黙ってスキップ
    }
  }
  return { assigned };
}

export async function unassignCourse(
  actorId: string,
  userId: string,
  courseId: string,
): Promise<void> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { id: true },
  });
  if (!enrollment) return;
  await prisma.enrollment.delete({
    where: { userId_courseId: { userId, courseId } },
  });
  await container.audit.write({
    actorId,
    action: "ENROLLMENT_DELETE",
    target: `Enrollment:${userId}:${courseId}`,
  });
}
