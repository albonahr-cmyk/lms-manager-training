import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/server/auth";
import { getAdminDashboard } from "@/server/services/report";

export const metadata = { title: "ダッシュボード | LMS" };

export default async function AdminDashboardPage() {
  await requireAdmin();
  const data = await getAdminDashboard();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">進捗ダッシュボード</h1>
        <p className="text-sm text-muted-foreground">
          全受講者の受講状況とテスト合格率を集計しています。
        </p>
      </div>

      {/* KPI カード */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>総 Enrollment 数</CardDescription>
            <CardTitle className="text-3xl">{data.totalEnrollments}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              完了済み: {data.completedEnrollments} 件
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>全体完了率</CardDescription>
            <CardTitle className="text-3xl">
              {data.overallCompletionRate}
              <span className="ml-1 text-base font-normal">%</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              role="progressbar"
              aria-valuenow={data.overallCompletionRate}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`全体完了率 ${data.overallCompletionRate}%`}
              className="h-2 w-full overflow-hidden rounded-full bg-secondary"
            >
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${data.overallCompletionRate}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>直近 30 日 テスト合格率</CardDescription>
            <CardTitle className="text-3xl">
              {data.testPassRateLast30Days}
              <span className="ml-1 text-base font-normal">%</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              期限超過: {data.overdueEnrollments} 件
            </p>
          </CardContent>
        </Card>
      </div>

      {/* コース別受講率テーブル */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">コース別受講完了率</h2>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>コース名</TableHead>
                <TableHead className="text-right">完了 / 総数</TableHead>
                <TableHead className="text-right">完了率</TableHead>
                <TableHead className="w-40">進捗バー</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.courseEnrollmentRates.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground"
                  >
                    受講データがありません。
                  </TableCell>
                </TableRow>
              ) : (
                data.courseEnrollmentRates.map((c) => (
                  <TableRow key={c.courseId}>
                    <TableCell className="font-medium">
                      {c.courseTitle}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.completedEnrollments} / {c.totalEnrollments}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.completionRate}%
                    </TableCell>
                    <TableCell>
                      <div
                        role="progressbar"
                        aria-valuenow={c.completionRate}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${c.courseTitle} 完了率 ${c.completionRate}%`}
                        className="h-2 w-full overflow-hidden rounded-full bg-secondary"
                      >
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${c.completionRate}%` }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* CSV ダウンロード */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">CSV エクスポート</h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <a href="/api/admin/export?type=users" download>
              ユーザー一覧
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href="/api/admin/export?type=courses" download>
              コース一覧
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href="/api/admin/export?type=progress" download>
              受講進捗
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
}
