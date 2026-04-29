import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/server/auth";

export const metadata = { title: "進捗レポート | LMS" };

export default async function AdminReportsPage() {
  await requireAdmin();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">進捗レポート</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            CSV エクスポートと集計画面は Phase 2b 以降で実装します。
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
