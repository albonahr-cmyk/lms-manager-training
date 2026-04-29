import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/server/auth";
import { prisma } from "@/server/repositories/db";

export const metadata = { title: "コース管理 | LMS" };

export default async function AdminCoursesPage() {
  await requireAdmin();
  const courses = await prisma.course.findMany({
    orderBy: { order: "asc" },
    include: {
      lessons: { select: { id: true } },
      enrollments: { select: { id: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">コース / 教材管理</h1>
        <p className="text-sm text-muted-foreground">
          一覧表示のみ。CRUD と動画アップロード UI は Phase 2b 以降で実装します。
        </p>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>タイトル</TableHead>
              <TableHead>レッスン数</TableHead>
              <TableHead>受講者数</TableHead>
              <TableHead>公開状態</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.title}</TableCell>
                <TableCell>{c.lessons.length}</TableCell>
                <TableCell>{c.enrollments.length}</TableCell>
                <TableCell>
                  {c.published ? (
                    <Badge>公開中</Badge>
                  ) : (
                    <Badge variant="secondary">下書き</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
