import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "サインイン | albona University" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const { error } = await searchParams;

  return (
    <main className="min-h-svh flex flex-col lg:flex-row">
      {/* 左パネル: ブランド */}
      <div
        className="hidden lg:flex lg:w-[60%] flex-col justify-between p-12 text-white"
        style={{
          background: "linear-gradient(135deg, #3B4FD4 0%, #E0607E 100%)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm font-bold text-lg">
            a
          </div>
          <span className="text-xl font-bold tracking-tight">albona</span>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            学びを、<br />シームレスに。
          </h1>
          <p className="text-lg text-white/75 max-w-md">
            マネージャー向け動画研修・テスト管理システム。<br />
            いつでもどこでも、自分のペースで学べます。
          </p>
        </div>

        <p className="text-xs text-white/50">
          © 2026 albona University
        </p>
      </div>

      {/* 右パネル: フォーム */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-12 bg-background">
        {/* モバイル用ロゴ */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div
            className="flex size-8 items-center justify-center rounded-full text-white font-bold text-base"
            style={{ background: "linear-gradient(135deg, #3B4FD4 0%, #E0607E 100%)" }}
          >
            a
          </div>
          <span className="text-lg font-bold tracking-tight" style={{ color: "#1A1A2E" }}>albona</span>
        </div>

        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">サインイン</h2>
            <p className="text-sm text-muted-foreground">
              研修管理システムにログインしてください。
            </p>
          </div>

          <SignInForm oauthError={error} />

          {(process.env.APP_MODE === "stub" || process.env.NODE_ENV !== "production") && (
            <div className="rounded-md border bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">テスト用認証情報 (モック)</p>
              <p>受講者: student1@example.com / student2@example.com</p>
              <p>管理者: admin@example.com</p>
              <p className="pt-1">
                パスワードは任意の文字 (例: <code className="rounded bg-muted px-1 py-0.5">a</code>) で OK
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
