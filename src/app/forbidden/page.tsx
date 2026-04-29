import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "アクセス拒否 | LMS" };

export default function ForbiddenPage() {
  return (
    <main className="min-h-svh flex items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>403 Forbidden</CardTitle>
          <CardDescription>
            この画面にアクセスする権限がありません。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/dashboard">ダッシュボードへ戻る</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
