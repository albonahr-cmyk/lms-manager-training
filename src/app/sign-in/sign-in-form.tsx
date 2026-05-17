"use client";

import { useActionState } from "react";
import { Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RequiredLabel } from "@/components/ui/label";
import { signInAction, type SignInActionState } from "./actions";

const initialState: SignInActionState = {};

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_state: "認証セッションが無効です。もう一度お試しください。",
  oauth_code: "GitHubからの認証コードが取得できませんでした。",
  oauth_token: "GitHubとの認証に失敗しました。",
  oauth_email: "GitHubアカウントのメールアドレスを取得できませんでした。",
  user_not_found: "このGitHubアカウントに紐付いたユーザーが見つかりません。",
};

export function SignInForm({ oauthError }: { oauthError?: string }) {
  const [state, formAction, isPending] = useActionState(
    signInAction,
    initialState,
  );

  const oauthErrorMessage = oauthError
    ? (OAUTH_ERROR_MESSAGES[oauthError] ?? "GitHub認証に失敗しました。")
    : null;

  return (
    <div className="space-y-4">
      <a href="/api/auth/github" className="block">
        <Button type="button" variant="outline" className="w-full gap-2">
          <Github className="size-4" aria-hidden="true" />
          GitHubでサインイン
        </Button>
      </a>

      <div className="relative flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">または</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <RequiredLabel htmlFor="email">メールアドレス</RequiredLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-required="true"
            defaultValue={state?.values?.email ?? ""}
          />
        </div>
        <div className="space-y-2">
          <RequiredLabel htmlFor="password">パスワード</RequiredLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-required="true"
          />
        </div>
        {(state?.error || oauthErrorMessage) ? (
          <p className="text-sm text-destructive" role="alert">
            {state?.error ?? oauthErrorMessage}
          </p>
        ) : null}
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "サインイン中..." : "サインイン"}
        </Button>
      </form>
    </div>
  );
}
