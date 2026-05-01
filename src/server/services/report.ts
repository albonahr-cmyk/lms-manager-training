/**
 * 管理者ダッシュボード用レポート集計サービス
 *
 * すべて Prisma の groupBy / count / aggregate で集約し、N+1 を避ける。
 */

import { prisma } from "@/server/repositories/db";

export type CourseEnrollmentRate = {
  courseId: string;
  courseTitle: string;
  totalEnrollments: number;
  completedEnrollments: number;
  completionRate: number; // 0-100 (%)
};

export type AdminDashboardData = {
  /** 全 Enrollment 数 */
  totalEnrollments: number;
  /** 完了済み Enrollment 数 (completedAt != null) */
  completedEnrollments: number;
  /** 完了率 0-100 (%) */
  overallCompletionRate: number;
  /** コースごとの受講完了率 */
  courseEnrollmentRates: CourseEnrollmentRate[];
  /** 直近 30 日のテスト合格率 0-100 (%) */
  testPassRateLast30Days: number;
  /** 期限超過 (dueAt < now && completedAt = null) の Enrollment 件数 */
  overdueEnrollments: number;
};

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // 並列実行でレイテンシを最小化
  const [
    totalEnrollments,
    completedEnrollments,
    overdueEnrollments,
    courseGroupData,
    submissionCounts,
  ] = await Promise.all([
    // 全 Enrollment 数
    prisma.enrollment.count(),

    // 完了済み Enrollment 数
    prisma.enrollment.count({
      where: { completedAt: { not: null } },
    }),

    // 期限超過 Enrollment 数
    prisma.enrollment.count({
      where: {
        dueAt: { lt: now },
        completedAt: null,
      },
    }),

    // コースごとの Enrollment 集計
    // groupBy で courseId ごとに全件数と完了件数を取得
    prisma.course.findMany({
      select: {
        id: true,
        title: true,
        _count: {
          select: {
            enrollments: true,
          },
        },
        enrollments: {
          where: { completedAt: { not: null } },
          select: { id: true },
        },
      },
      orderBy: { order: "asc" },
    }),

    // 直近 30 日の Submission 集計
    prisma.submission.groupBy({
      by: ["status"],
      where: {
        submittedAt: { gte: thirtyDaysAgo },
        status: { in: ["PASSED", "SUBMITTED", "FAILED"] },
      },
      _count: { status: true },
    }),
  ]);

  // コースごとの完了率を算出
  const courseEnrollmentRates: CourseEnrollmentRate[] = courseGroupData.map(
    (c) => {
      const total = c._count.enrollments;
      const completed = c.enrollments.length;
      const completionRate =
        total === 0 ? 0 : Math.round((completed / total) * 100);
      return {
        courseId: c.id,
        courseTitle: c.title,
        totalEnrollments: total,
        completedEnrollments: completed,
        completionRate,
      };
    },
  );

  // 全体の完了率
  const overallCompletionRate =
    totalEnrollments === 0
      ? 0
      : Math.round((completedEnrollments / totalEnrollments) * 100);

  // テスト合格率 (PASSED / (PASSED + SUBMITTED + FAILED))
  const passedCount =
    submissionCounts.find((s) => s.status === "PASSED")?._count.status ?? 0;
  const totalSubmissions = submissionCounts.reduce(
    (sum, s) => sum + s._count.status,
    0,
  );
  const testPassRateLast30Days =
    totalSubmissions === 0
      ? 0
      : Math.round((passedCount / totalSubmissions) * 100);

  return {
    totalEnrollments,
    completedEnrollments,
    overallCompletionRate,
    courseEnrollmentRates,
    testPassRateLast30Days,
    overdueEnrollments,
  };
}
