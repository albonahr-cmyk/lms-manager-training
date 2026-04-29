import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "サインイン | LMS" };

export default async function SignInPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="min-h-svh flex items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>サインイン</CardTitle>
          <CardDescription>
            研修管理システムにログインしてください。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SignInForm />
          <div className="rounded-md border bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">テスト用認証情報 (モック)</p>
            <p>受講者: student1@example.com / student2@example.com / student3@example.com</p>
            <p>管理者: admin@example.com</p>
            <p className="pt-1">パスワードは任意の文字 (例: <code>a</code>) で OK</p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
