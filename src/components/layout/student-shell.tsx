import Link from "next/link";
import { Sprout } from "lucide-react";
import { UserMenu } from "./user-menu";
import { Button } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
  user: { name: string; email: string; role: "ADMIN" | "STUDENT" };
};

export function StudentShell({ children, user }: Props) {
  return (
    <div className="min-h-svh flex flex-col bg-background">
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 h-16">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 font-semibold transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg px-1"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
              <Sprout className="size-4.5" aria-hidden="true" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">研修 LMS</span>
              <span className="text-[10px] font-normal text-muted-foreground">
                マイラーニング
              </span>
            </div>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user.role === "ADMIN" && (
              <Button asChild variant="outline" size="sm">
                <Link href="/admin">管理画面</Link>
              </Button>
            )}
            <UserMenu name={user.name} email={user.email} role={user.role} />
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-6 pb-10 pt-2">
        {children}
      </main>
    </div>
  );
}
