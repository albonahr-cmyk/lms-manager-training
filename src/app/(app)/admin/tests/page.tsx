import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/server/auth";
import { prisma } from "@/server/repositories/db";
import { CreateTestForm } from "./create-test-form";

export const metadata = { title: "テスト管理 | LMS" };

export default async function AdminTestsPage() {
  await requireAdmin();
  const [tests, courses] = await Promise.all([
    prisma.test.findMany({
      orderBy: [{ courseId: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        published: true,
        passingScore: true,
        maxAttempts: true,
        course: { select: { id: true, title: true } },
        _count: { select: { questions: true } },
      },
    }),
    prisma.course.findMany({
      orderBy: { order: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">テスト管理</h1>
        <p className="text-sm text-muted-foreground">
          コースごとに確認テストを作成し、設問を編集します。
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          先にコースを作成してください。
        </div>
      ) : (
        <CreateTestForm courses={courses} />
      )}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>テスト名</TableHead>
              <TableHead>コース</TableHead>
              <TableHead>問題数</TableHead>
              <TableHead>合格点</TableHead>
              <TableHead>受験上限</TableHead>
              <TableHead>状態</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tests.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.title}</TableCell>
                <TableCell>{t.course.title}</TableCell>
                <TableCell>{t._count.questions}</TableCell>
                <TableCell>{t.passingScore}%</TableCell>
                <TableCell>{t.maxAttempts}</TableCell>
                <TableCell>
                  {t.published ? (
                    <Badge>公開中</Badge>
                  ) : (
                    <Badge variant="secondary">下書き</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild size="xs" variant="outline">
                    <Link href={`/admin/tests/${t.id}`}>編集</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {tests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  まだテストがありません。
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
