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
import { CreateUserForm } from "./create-user-form";
import { BulkCreateUsersForm } from "./bulk-create-form";
import { UserRowActions } from "./user-row-actions";

export const metadata = { title: "ユーザー管理 | LMS" };

export default async function AdminUsersPage() {
  const me = await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      deactivated: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">ユーザー管理</h1>
        <p className="text-sm text-muted-foreground">
          受講者・管理者の作成、ロール変更、無効化が行えます。
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CreateUserForm />
        <BulkCreateUsersForm />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              <TableHead>メールアドレス</TableHead>
              <TableHead>ロール</TableHead>
              <TableHead>状態</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  {u.name}
                  {u.id === me.id ? (
                    <Badge variant="outline" className="ml-2">
                      あなた
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                    {u.role === "ADMIN" ? "管理者" : "受講者"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {u.deactivated ? (
                    <Badge variant="destructive">無効</Badge>
                  ) : (
                    <Badge variant="outline">有効</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <UserRowActions
                    userId={u.id}
                    role={u.role}
                    deactivated={u.deactivated}
                    isSelf={u.id === me.id}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
