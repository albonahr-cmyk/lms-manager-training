import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/server/auth";
import { prisma } from "@/server/repositories/db";

export const metadata = { title: "ダッシュボード | LMS" };

export default async function DashboardPage() {
  const user = await requireUser();

  // 担当コース一覧 (Enrollment 経由で Course と Lesson と Test を取得)
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id },
    include: {
      course: {
        include: {
          lessons: { select: { id: true } },
          tests: {
            where: { published: true },
            select: { id: true },
          },
        },
      },
    },
    orderBy: { assignedAt: "asc" },
  });

  // ユーザーの全 Progress を一括取得 (N+1 回避)
  const lessonIds = enrollments.flatMap((e) => e.course.lessons.map((l) => l.id));
  const progresses =
    lessonIds.length > 0
      ? await prisma.progress.findMany({
          where: { userId: user.id, lessonId: { in: lessonIds } },
          select: { lessonId: true, completed: true },
        })
      : [];
  const completedSet = new Set(
    progresses.filter((p) => p.completed).map((p) => p.lessonId),
  );

  // ユーザーの PASSED Submission を一括取得 (test pass バッジ用)
  const allTestIds = enrollments.flatMap((e) =>
    e.course.tests.map((t) => t.id),
  );
  const passedSubs =
    allTestIds.length > 0
      ? await prisma.submission.findMany({
          where: {
            userId: user.id,
            testId: { in: allTestIds },
            status: "PASSED",
          },
          select: { testId: true },
        })
      : [];
  const passedTestSet = new Set(passedSubs.map((s) => s.testId));

  const courseCards = enrollments.map((e) => {
    const total = e.course.lessons.length;
    const completed = e.course.lessons.filter((l) =>
      completedSet.has(l.id),
    ).length;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    const courseTestIds = e.course.tests.map((t) => t.id);
    const hasPassedTest = courseTestIds.some((tid) => passedTestSet.has(tid));
    return {
      id: e.course.id,
      title: e.course.title,
      description: e.course.description,
      total,
      completed,
      pct,
      hasTest: courseTestIds.length > 0,
      hasPassedTest,
    };
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">マイダッシュボード</h1>
        <p className="text-sm text-muted-foreground">
          {user.name} さんに割り当てられたコースを表示しています。
        </p>
      </div>

      {courseCards.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            割り当てられたコースはまだありません。
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courseCards.map((c) => (
            <Link
              key={c.id}
              href={`/courses/${c.id}`}
              className="block focus:outline-none focus:ring-2 focus:ring-ring rounded-lg"
            >
              <Card className="h-full transition-colors hover:bg-accent/40">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{c.title}</CardTitle>
                    <div className="flex items-center gap-1">
                      {c.hasPassedTest ? <Badge>テスト合格</Badge> : null}
                      <Badge variant={c.pct === 100 ? "default" : "secondary"}>
                        {c.pct}%
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {c.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    レッスン {c.completed} / {c.total} 完了
                    {c.hasTest ? " · 確認テストあり" : ""}
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={c.pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
