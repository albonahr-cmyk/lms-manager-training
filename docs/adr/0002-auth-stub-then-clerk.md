# 0002. 認証は stub から Clerk へ port 経由で差し替える

- Status: Accepted
- Date: 2026-04-29
- Author: architect subagent
- Related: ADR 0001 (mock-first)

## Context

要件:
- 受講者 / 管理者の 2 ロール (`STUDENT` / `ADMIN`)。
- 本番は Clerk + Vercel BotID。MFA はオプション。
- Phase 1〜3 は SaaS 契約なしでクリッカブルにしたい。

呼び出し側 (Server Component / Server Action / Route Handler) は **どちらの実装でも同じ API** を使えるべき。

## Decision

`AuthPort` を以下の TypeScript 型で定義し、stub / Clerk アダプタの双方が実装する。
利用側コードは `requireUser()`, `requireAdmin()`, `getCurrentUser()` の 3 関数のみを参照し、**adapter 切替時に変更不要**。

### Port インターフェース (`src/server/ports/auth.ts`)

```ts
import type { Role } from "@prisma/client";

export type SessionUser = {
  id: string;          // User.id (cuid)
  email: string;
  name: string;
  role: Role;          // "STUDENT" | "ADMIN"
  deactivated: boolean;
};

export type SignInInput = { email: string; password: string };
export type SignInResult =
  | { ok: true; user: SessionUser }
  | { ok: false; code: "INVALID_CREDENTIALS" | "DEACTIVATED" | "RATE_LIMITED" };

export interface AuthPort {
  signIn(input: SignInInput): Promise<SignInResult>;
  signOut(): Promise<void>;
  /** 現在の HTTP リクエストから session user を解決。null なら未ログイン */
  getCurrentUser(): Promise<SessionUser | null>;
}
```

### 利用側 API (`src/server/auth.ts`)

```ts
import { redirect } from "next/navigation";
import { container } from "./container";
import type { SessionUser } from "./ports/auth";

export async function getCurrentUser(): Promise<SessionUser | null> {
  return container.auth.getCurrentUser();
}

export async function requireUser(): Promise<SessionUser> {
  const u = await container.auth.getCurrentUser();
  if (!u || u.deactivated) redirect("/sign-in");
  return u;
}

export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role !== "ADMIN") redirect("/forbidden");
  return u;
}
```

これらのシグネチャは **stub 期 / Clerk 期で完全に同一**。Server Component / Server Action / Route Handler はこの 3 関数だけを呼ぶ。

### Stub アダプタ (`src/server/adapters/stub/auth.ts`)

- `cookies()` (Next.js) で `session_user_id` cookie を読み書き。
- `signIn` は `prisma.user.findUnique({ where: { email } })` し、seed パスワード (環境変数 `STUB_PASSWORD` または定数 `"password"`) と一致したら cookie set。
- 成功時 `auditPort.write({ action: USER_LOGIN, actorId })`。
- `signOut` は cookie を削除。
- `getCurrentUser` は cookie の `userId` から DB lookup。

### Clerk アダプタ (`src/server/adapters/prod/clerk-auth.ts`)

- `signIn` は実装しない (Clerk の sign-in UI へリダイレクト)。`SignInResult` を返さず throw、または stub と同じ `Promise<SignInResult>` を返す形にして互換性を維持 (Clerk Hosted UI 経由の場合は未使用)。
- `getCurrentUser` は `auth()` (Clerk) で `userId` を取得 → `prisma.user.findUnique({ where: { clerkUserId } })` で `User` レコードを引き、`SessionUser` を返す。
- `signOut` は Clerk の `signOut()` を呼ぶ。
- Clerk Webhook (`/api/webhooks/clerk`) で `user.created` / `user.updated` / `user.deleted` を `User` テーブルに同期する。

### Container (`src/server/container.ts`)

```ts
import type { AuthPort } from "./ports/auth";
import { stubAuth } from "./adapters/stub/auth";
// import { clerkAuth } from "./adapters/prod/clerk-auth";

const mode = process.env.APP_MODE ?? "stub";

export const container = {
  auth: (mode === "prod" ? /* clerkAuth */ stubAuth : stubAuth) as AuthPort,
};
```

## Consequences

### 良い影響
- 利用側コードは port の 3 関数しか触らないため、Clerk への切替は `container.ts` の 1 行と adapter ファイル追加で完了する。
- テストでは `stubAuth` をそのまま使えるため、Clerk のモックライブラリ依存が不要。

### 悪い影響 / トレードオフ
- `signIn` の挙動が Clerk Hosted UI と stub フォームで微妙に違う (Hosted UI は redirect、stub は SA 内で完結)。利用側は `signInAction` Server Action を経由する形に統一して吸収する。
- `SessionUser` を独自型で持つため、Clerk 側の追加クレーム (例: `imageUrl`) を使いたい場合は port を拡張する必要がある。

### 将来の拡張に与える影響
- SSO / SAML を追加したくなった場合も `AuthPort` を満たす別アダプタを追加するだけで対応可能。

## Alternatives considered

- **Clerk SDK を直接呼ぶ**: モック期も `clerkClient` のテストモードを使う案。
  - 不採用理由: Clerk アカウント・キー設定が必須になり mock-first の旨味が薄れる。
- **NextAuth.js**: Clerk の代わりに NextAuth で credentials provider をモック扱いに。
  - 不採用理由: 本番が Clerk で確定済み。NextAuth のモデルとの二重メンテは負債。

## 切替時の作業チェックリスト

1. Clerk プロジェクト作成、`CLERK_SECRET_KEY` / `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` を Vercel env に登録
2. `src/server/adapters/prod/clerk-auth.ts` を実装
3. `src/app/api/webhooks/clerk/route.ts` で User 同期
4. `middleware.ts` に Clerk middleware を追加し、sign-in route に BotID を適用
5. `container.ts` を `mode === 'prod'` で `clerkAuth` を返すよう変更
6. seed ユーザーの `clerkUserId` をリンクするバックフィル (または webhook 経由で自動)
7. `APP_MODE=prod` を Production env に設定
