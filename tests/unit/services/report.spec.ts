/**
 * getAdminDashboard の集計値検算テスト
 *
 * fixture を注入して completionRate / overallCompletionRate / testPassRate を assert する。
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { testPrisma, resetDb } from "../../helpers/db";
import { getAdminDashboard } from "@/server/services/report";

// DATABASE_URL=file:./prisma/test.db は vitest.config.ts の env で設定済み

describe("getAdminDashboard", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("Enrollment が 0 件のとき全体の completionRate は 0% になる", async () => {
    const data = await getAdminDashboard();

    expect(data.totalEnrollments).toBe(0);
    expect(data.completedEnrollments).toBe(0);
    expect(data.overallCompletionRate).toBe(0);
    expect(data.testPassRateLast30Days).toBe(0);
  });

  it("全員完了の場合 overallCompletionRate が 100% になる", async () => {
    const course = await testPrisma.course.create({
      data: { title: "コース A", description: "", order: 0, published: true },
      select: { id: true },
    });

    const user1 = await testPrisma.user.create({
      data: { email: "u1@example.com", name: "U1", role: "STUDENT" },
      select: { id: true },
    });
    const user2 = await testPrisma.user.create({
      data: { email: "u2@example.com", name: "U2", role: "STUDENT" },
      select: { id: true },
    });

    await testPrisma.enrollment.createMany({
      data: [
        { userId: user1.id, courseId: course.id, completedAt: new Date() },
        { userId: user2.id, courseId: course.id, completedAt: new Date() },
      ],
    });

    const data = await getAdminDashboard();

    expect(data.totalEnrollments).toBe(2);
    expect(data.completedEnrollments).toBe(2);
    expect(data.overallCompletionRate).toBe(100);
  });

  it("半分完了の場合 overallCompletionRate が 50% になる", async () => {
    const course = await testPrisma.course.create({
      data: { title: "コース B", description: "", order: 0, published: true },
      select: { id: true },
    });

    const users = await Promise.all([
      testPrisma.user.create({ data: { email: "u3@example.com", name: "U3", role: "STUDENT" }, select: { id: true } }),
      testPrisma.user.create({ data: { email: "u4@example.com", name: "U4", role: "STUDENT" }, select: { id: true } }),
    ]);

    await testPrisma.enrollment.createMany({
      data: [
        { userId: users[0].id, courseId: course.id, completedAt: new Date() }, // 完了
        { userId: users[1].id, courseId: course.id, completedAt: null }, // 未完了
      ],
    });

    const data = await getAdminDashboard();

    expect(data.totalEnrollments).toBe(2);
    expect(data.completedEnrollments).toBe(1);
    expect(data.overallCompletionRate).toBe(50);
  });

  it("コースごとの completionRate が正しく算出される", async () => {
    const course = await testPrisma.course.create({
      data: { title: "コース C", description: "", order: 0, published: true },
      select: { id: true },
    });

    const users = await Promise.all([
      testPrisma.user.create({ data: { email: "u5@example.com", name: "U5", role: "STUDENT" }, select: { id: true } }),
      testPrisma.user.create({ data: { email: "u6@example.com", name: "U6", role: "STUDENT" }, select: { id: true } }),
      testPrisma.user.create({ data: { email: "u7@example.com", name: "U7", role: "STUDENT" }, select: { id: true } }),
    ]);

    await testPrisma.enrollment.createMany({
      data: [
        { userId: users[0].id, courseId: course.id, completedAt: new Date() }, // 完了
        { userId: users[1].id, courseId: course.id, completedAt: new Date() }, // 完了
        { userId: users[2].id, courseId: course.id, completedAt: null }, // 未完了
      ],
    });

    const data = await getAdminDashboard();

    const rate = data.courseEnrollmentRates.find((r) => r.courseId === course.id);
    expect(rate).toBeDefined();
    expect(rate!.totalEnrollments).toBe(3);
    expect(rate!.completedEnrollments).toBe(2);
    expect(rate!.completionRate).toBe(67); // round(2/3 * 100) = 67
  });

  it("直近 30 日のテスト合格率が正しく計算される", async () => {
    const course = await testPrisma.course.create({
      data: { title: "コース D", description: "", order: 0, published: true },
      select: { id: true },
    });
    const test = await testPrisma.test.create({
      data: {
        courseId: course.id,
        title: "テスト",
        passingScore: 70,
        maxAttempts: 3,
        published: true,
      },
      select: { id: true },
    });
    const user = await testPrisma.user.create({
      data: { email: "u8@example.com", name: "U8", role: "STUDENT" },
      select: { id: true },
    });

    const now = new Date();

    // SQLite FK 制約上、createMany では同テーブルへの FK 違反が起こりやすいため 1 件ずつ作成する
    await testPrisma.submission.create({
      data: { testId: test.id, userId: user.id, status: "PASSED", score: 80, attemptNo: 1, submittedAt: now },
    });
    await testPrisma.submission.create({
      data: { testId: test.id, userId: user.id, status: "FAILED", score: 40, attemptNo: 2, submittedAt: now },
    });
    await testPrisma.submission.create({
      data: { testId: test.id, userId: user.id, status: "FAILED", score: 50, attemptNo: 3, submittedAt: now },
    });

    const data = await getAdminDashboard();

    // PASSED=1, FAILED=2 → 1/3 = 33%
    expect(data.testPassRateLast30Days).toBe(33);
  });

  it("期限超過 Enrollment が正しくカウントされる", async () => {
    const course = await testPrisma.course.create({
      data: { title: "コース E", description: "", order: 0, published: true },
      select: { id: true },
    });

    const users = await Promise.all([
      testPrisma.user.create({ data: { email: "u9@example.com", name: "U9", role: "STUDENT" }, select: { id: true } }),
      testPrisma.user.create({ data: { email: "u10@example.com", name: "U10", role: "STUDENT" }, select: { id: true } }),
    ]);

    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 日前

    await testPrisma.enrollment.createMany({
      data: [
        { userId: users[0].id, courseId: course.id, dueAt: pastDate, completedAt: null }, // 期限超過
        { userId: users[1].id, courseId: course.id, dueAt: pastDate, completedAt: new Date() }, // 期限超過だが完了済み
      ],
    });

    const data = await getAdminDashboard();

    expect(data.overdueEnrollments).toBe(1);
  });
});
