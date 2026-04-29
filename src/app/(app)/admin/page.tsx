import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdmin } from "@/server/auth";
import { prisma } from "@/server/repositories/db";

export const metadata = { title: "管理画面 | LMS" };

export default async function AdminPage() {
  await requireAdmin();

  const [userCount, courseCount, incompleteCount] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.enrollment.count({ where: { completedAt: null } }),
  ]);

  const links: { href: string; title: string; desc: string }[] = [
    {
      href: "/admin/users",
      title: "ユーザー管理",
      desc: "受講者・管理者の一覧と CSV 一括登録 (Phase 2b)",
    },
    {
      href: "/admin/courses",
      title: "コース / 教材管理",
      desc: "コース、レッスン、動画アップロード (Phase 2b)",
    },
    {
      href: "/admin/tests",
      title: "テスト管理",
      desc: "確認テスト、採点設定 (Phase 2b)",
    },
    {
      href: "/admin/reports",
      title: "進捗レポート",
      desc: "受講率、合格率、CSV エクスポート (Phase 2b)",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">管理ダッシュボード</h1>
        <p className="text-sm text-muted-foreground">
          現在の登録状況を表示しています。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>ユーザー総数</CardDescription>
            <CardTitle className="text-3xl">{userCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>コース総数</CardDescription>
            <CardTitle className="text-3xl">{courseCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>未完了 Enrollment</CardDescription>
            <CardTitle className="text-3xl">{incompleteCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">管理機能</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <Card className="h-full transition-colors hover:bg-accent/40">
                <CardHeader>
                  <CardTitle className="text-base">{l.title}</CardTitle>
                  <CardDescription>{l.desc}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
