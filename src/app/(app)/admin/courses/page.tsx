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
import { CreateCourseForm } from "./create-course-form";

export const metadata = { title: "コース管理 | LMS" };

export default async function AdminCoursesPage() {
  await requireAdmin();
  const courses = await prisma.course.findMany({
    orderBy: { order: "asc" },
    select: {
      id: true,
      title: true,
      published: true,
      order: true,
      _count: { select: { lessons: true, enrollments: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">コース / 教材管理</h1>
        <p className="text-sm text-muted-foreground">
          コースを作成し、各コース詳細でレッスン・受講割当を編集します。
        </p>
      </div>

      <CreateCourseForm />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>順</TableHead>
              <TableHead>タイトル</TableHead>
              <TableHead>レッスン数</TableHead>
              <TableHead>受講者数</TableHead>
              <TableHead>公開状態</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.order}</TableCell>
                <TableCell className="font-medium">{c.title}</TableCell>
                <TableCell>{c._count.lessons}</TableCell>
                <TableCell>{c._count.enrollments}</TableCell>
                <TableCell>
                  {c.published ? (
                    <Badge>公開中</Badge>
                  ) : (
                    <Badge variant="secondary">下書き</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild size="xs" variant="outline">
                    <Link href={`/admin/courses/${c.id}`}>編集</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  コースがまだありません。上のフォームから作成してください。
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
