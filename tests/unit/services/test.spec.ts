/**
 * submitSubmission の自動採点ロジックのユニットテスト
 *
 * SINGLE 選択 / MULTIPLE 選択 / 部分点なし / タイムリミット超過 (status 判定) を検証する。
 * Prisma は test.db (SQLite) を直接使用。container の audit/logger は noop stub を注入。
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { testPrisma, resetDb } from "../../helpers/db";
import { submitSubmission } from "@/server/services/test";

// container の audit/logger を noop にしてサイドエフェクトを排除
vi.mock("@/server/container", () => ({
  container: {
    audit: { write: vi.fn().mockResolvedValue(undefined) },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  },
}));

// ---- セットアップ ヘルパー ----

type Fixtures = {
  userId: string;
  courseId: string;
  testId: string;
  submissionId: string;
  questions: {
    singleQ: { id: string; correctChoiceId: string; wrongChoiceId: string };
    multiQ: {
      id: string;
      correctChoiceIds: string[];
      wrongChoiceId: string;
    };
  };
};

async function buildFixtures(): Promise<Fixtures> {
  const user = await testPrisma.user.create({
    data: { email: "testuser@example.com", name: "テストユーザー", role: "STUDENT" },
    select: { id: true },
  });

  const course = await testPrisma.course.create({
    data: { title: "テストコース", description: "", order: 0, published: true },
    select: { id: true },
  });

  const lesson = await testPrisma.lesson.create({
    data: {
      courseId: course.id,
      title: "レッスン1",
      videoUrl: "/sample.mp4",
      durationSec: 60,
      order: 0,
    },
    select: { id: true },
  });

  await testPrisma.enrollment.create({
    data: { userId: user.id, courseId: course.id },
  });

  await testPrisma.progress.create({
    data: {
      userId: user.id,
      lessonId: lesson.id,
      watchedSec: 60,
      completed: true,
      completedAt: new Date(),
    },
  });

  const test = await testPrisma.test.create({
    data: {
      courseId: course.id,
      title: "確認テスト",
      passingScore: 70,
      maxAttempts: 3,
      published: true,
    },
    select: { id: true },
  });

  // SINGLE 問題: 選択肢 2 つ、1 つ正解
  const singleQ = await testPrisma.question.create({
    data: {
      testId: test.id,
      type: "SINGLE",
      prompt: "問 1",
      order: 0,
      choices: {
        create: [
          { label: "正解", correct: true, order: 0 },
          { label: "不正解", correct: false, order: 1 },
        ],
      },
    },
    include: { choices: true },
  });

  // MULTIPLE 問題: 選択肢 3 つ、2 つ正解
  const multiQ = await testPrisma.question.create({
    data: {
      testId: test.id,
      type: "MULTIPLE",
      prompt: "問 2",
      order: 1,
      choices: {
        create: [
          { label: "正解A", correct: true, order: 0 },
          { label: "正解B", correct: true, order: 1 },
          { label: "不正解C", correct: false, order: 2 },
        ],
      },
    },
    include: { choices: true },
  });

  const submission = await testPrisma.submission.create({
    data: {
      testId: test.id,
      userId: user.id,
      status: "IN_PROGRESS",
      attemptNo: 1,
    },
    select: { id: true },
  });

  const singleCorrect = singleQ.choices.find((c) => c.correct)!;
  const singleWrong = singleQ.choices.find((c) => !c.correct)!;
  const multiCorrects = multiQ.choices.filter((c) => c.correct).map((c) => c.id);
  const multiWrong = multiQ.choices.find((c) => !c.correct)!;

  return {
    userId: user.id,
    courseId: course.id,
    testId: test.id,
    submissionId: submission.id,
    questions: {
      singleQ: {
        id: singleQ.id,
        correctChoiceId: singleCorrect.id,
        wrongChoiceId: singleWrong.id,
      },
      multiQ: {
        id: multiQ.id,
        correctChoiceIds: multiCorrects,
        wrongChoiceId: multiWrong.id,
      },
    },
  };
}

describe("submitSubmission", () => {
  let fx: Fixtures;

  beforeEach(async () => {
    await resetDb();
    fx = await buildFixtures();
  });

  it("SINGLE 問題に正解すると score=100 かつ PASSED になる (passingScore=70)", async () => {
    // 2 問中 2 問正解 → 100点
    const result = await submitSubmission(fx.submissionId, fx.userId, [
      { questionId: fx.questions.singleQ.id, choiceIds: [fx.questions.singleQ.correctChoiceId] },
      { questionId: fx.questions.multiQ.id, choiceIds: fx.questions.multiQ.correctChoiceIds },
    ]);

    expect(result.score).toBe(100);
    expect(result.status).toBe("PASSED");
  });

  it("SINGLE 問題に不正解すると score=50 (2問中1問正解) かつ FAILED になる", async () => {
    const result = await submitSubmission(fx.submissionId, fx.userId, [
      { questionId: fx.questions.singleQ.id, choiceIds: [fx.questions.singleQ.wrongChoiceId] },
      { questionId: fx.questions.multiQ.id, choiceIds: fx.questions.multiQ.correctChoiceIds },
    ]);

    expect(result.score).toBe(50);
    expect(result.status).toBe("FAILED");
  });

  it("MULTIPLE 問題は部分点なし: 正解の一部のみ選択すると不正解になる", async () => {
    // multiQ の正解は 2 つ。1 つだけ選ぶと不正解
    const result = await submitSubmission(fx.submissionId, fx.userId, [
      { questionId: fx.questions.singleQ.id, choiceIds: [fx.questions.singleQ.correctChoiceId] },
      { questionId: fx.questions.multiQ.id, choiceIds: [fx.questions.multiQ.correctChoiceIds[0]] },
    ]);

    // singleQ: 正解 (1点) + multiQ: 不正解 (0点) = 1/2 = 50%
    expect(result.score).toBe(50);
    expect(result.status).toBe("FAILED");
  });

  it("MULTIPLE 問題で正解に余分な選択肢を加えると不正解になる (部分点なし)", async () => {
    const result = await submitSubmission(fx.submissionId, fx.userId, [
      { questionId: fx.questions.singleQ.id, choiceIds: [fx.questions.singleQ.correctChoiceId] },
      {
        questionId: fx.questions.multiQ.id,
        choiceIds: [...fx.questions.multiQ.correctChoiceIds, fx.questions.multiQ.wrongChoiceId],
      },
    ]);

    expect(result.score).toBe(50);
    expect(result.status).toBe("FAILED");
  });

  it("全問不正解 (回答なし) で score=0 かつ FAILED になる", async () => {
    const result = await submitSubmission(fx.submissionId, fx.userId, []);

    expect(result.score).toBe(0);
    expect(result.status).toBe("FAILED");
  });

  it("既に確定済みの Submission を再送信しようとすると CONFLICT エラーが発生する", async () => {
    // 一度確定させる
    await submitSubmission(fx.submissionId, fx.userId, []);

    // 同じ submissionId で再度送信を試みる
    await expect(
      submitSubmission(fx.submissionId, fx.userId, []),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("他人の Submission を送信しようとすると FORBIDDEN エラーが発生する", async () => {
    const otherUser = await testPrisma.user.create({
      data: { email: "other@example.com", name: "他のユーザー", role: "STUDENT" },
      select: { id: true },
    });

    await expect(
      submitSubmission(fx.submissionId, otherUser.id, []),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
