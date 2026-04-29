import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/server/auth";

export const metadata = { title: "テスト管理 | LMS" };

export default async function AdminTestsPage() {
  await requireAdmin();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">テスト管理</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            テスト・設問・選択肢の CRUD は Phase 2b 以降で実装します。
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
