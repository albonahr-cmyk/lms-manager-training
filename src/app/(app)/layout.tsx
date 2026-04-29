import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/server/auth";
import { signOutAction } from "@/app/sign-in/actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-svh flex flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="font-semibold">
            LMS 研修管理
          </Link>
          <div className="flex items-center gap-3">
            {user.role === "ADMIN" ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/admin">管理画面</Link>
              </Button>
            ) : null}
            <span className="text-sm text-muted-foreground">
              {user.name} ({user.role === "ADMIN" ? "管理者" : "受講者"})
            </span>
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="sm">
                サインアウト
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
