# アーキテクチャ概要

> 100 名規模・社内利用の LMS。Mock-first で実装し、Phase 4 で本番統合に差し替える。

## 1. スタック

| レイヤ | 採用 |
| --- | --- |
| Framework | Next.js 16 App Router (TypeScript strict) |
| Runtime | Vercel Fluid Compute (Node.js 24 LTS), Edge は不使用 |
| DB | 本番: Neon Postgres / モック: SQLite (`file:./dev.db`) |
| ORM | Prisma (provider は postgresql 固定) |
| Auth | 本番: Clerk + Vercel BotID / モック: cookie session スタブ |
| Storage | 本番: Vercel Blob (private + 署名 URL) / モック: `public/sample.mp4` |
| Mail | 本番: Resend / モック: `console.log` |
| UI | shadcn/ui + Tailwind v4 |
| Cron | Vercel Cron → `/api/cron/*` |
| Test | Vitest + Testing Library + Playwright |

## 2. ランタイム配置 (本番想定)

```
[ Browser ]
    | HTTPS
    v
[ Vercel Edge Network ]  -- BotID (login pages)
    |
    v (Fluid Compute, Node.js 24)
+-------------------------------------------+
| Next.js App Router                        |
|  - Server Components (一覧/集計の描画)     |
|  - Server Actions  (フォーム送信)          |
|  - Route Handlers  (/api/progress, cron, |
|                     csv export, webhooks) |
+-------------------------------------------+
   |                |                   |
   v                v                   v
[ Clerk ]       [ Neon PG ]       [ Vercel Blob ]
                via Prisma          private + signed URL
                                          ^
                                          | webhook
                                    [ Resend ] (送信)
                                    [ Vercel Cron ] (日次)
```

モックは同じ Next.js プロセス内にスタブ実装を内包する (外部接続なし)。

## 3. ports & adapters

外部依存 (Auth, Mail, Storage, Logger) は `src/server/ports/*.ts` に **interface (port)** として定義し、`src/server/adapters/{stub,prod}/*.ts` に実装を置く。`src/server/container.ts` が `process.env.APP_MODE` で切替。呼び出し側 (services / route handlers) は port のみ知る。

## 4. 主要リクエストフロー

### 4.1 ログイン
1. `/sign-in` (Server Component) → form submit (Server Action)
2. `authPort.signIn(email, password)` を呼ぶ
   - stub: cookie 検証 + seed ユーザー lookup
   - prod: Clerk SDK
3. 成功時、`User.id` を `session` cookie に書き込み redirect
4. `auditPort.write({ action: USER_LOGIN, actorId })`

### 4.2 動画視聴 + 進捗保存
1. `/courses/[id]/lessons/[lessonId]` (Server Component) で `User`, `Lesson`, `Progress` を取得 (Prisma)
2. クライアント `<VideoPlayer>` が 10 秒間隔で `/api/progress` (Route Handler) に POST
3. 入力 zod validation → `progressService.upsert(userId, lessonId, watchedSec, lastPositionSec)`
4. `watchedSec / durationSec >= requiredCompletionRate ?? 0.95` で `completed = true`
5. blockSeek = true の Lesson は前方シークを 422 で拒否

### 4.3 テスト受験 + 採点
1. ADMIN が `Test`, `Question`, `Choice` を作成 (Server Action)
2. STUDENT が `/tests/[id]` 開始 → `Submission` (status=IN_PROGRESS) を作成
3. 出題は Server Component で `shuffleQuestions=true` 固定でシャッフル、`Choice` も shuffle
4. submit (Server Action) で `Answer` 一括 insert → 自動採点
   - 部分点なし。問題ごとに「選んだ集合」と「正解集合」が完全一致のみ正解
   - score = 正解数 / 全問数 * 100、`status = score >= passingScore ? PASSED : FAILED`
5. 結果ページで解説 (`Question.explanation`) を表示
6. 再受験は `attemptNo < maxAttempts` のときのみ許可

### 4.4 CSV エクスポート (ADMIN)
1. `/admin/reports/export?type=progress` (Route Handler)
2. `requireAdmin()` → Prisma 集計クエリ → `text/csv` でストリーミング応答
3. `auditPort.write({ action: EXPORT_CSV })`

## 5. モック vs 本番

| 領域 | モック | 本番 | 切替時の作業 |
| --- | --- | --- | --- |
| Auth | cookie session, seed ユーザー | Clerk + BotID | adapter を `clerk` に切替、Clerk webhook で User 同期 |
| DB | SQLite (`file:./dev.db`) | Neon Postgres | `DATABASE_URL` 切替 + `prisma migrate deploy` |
| 動画 | `/public/sample.mp4` 固定 | Vercel Blob (private) | アップロード UI 実装、署名 URL 発行 |
| Mail | `console.log` | Resend SDK | adapter 差替、テンプレート整備 |
| Bot 保護 | なし | Vercel BotID | sign-in route に BotID middleware |
| 集計 | Server Component で Prisma 集計 | 同左 (リアルタイム) | 変更なし |
| 完了率 | 0.95 既定, Lesson で上書き可 | 同左 | 変更なし |

## 6. ディレクトリ構成 (予定)

```
.
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (student)/          # 受講者画面
│   │   ├── admin/              # 管理画面
│   │   └── api/
│   │       ├── progress/route.ts
│   │       ├── cron/reminders/route.ts
│   │       └── admin/export/route.ts
│   ├── server/
│   │   ├── ports/              # interface (auth, mail, storage, logger)
│   │   ├── adapters/
│   │   │   ├── stub/           # モック実装
│   │   │   └── prod/           # Clerk / Resend / Blob
│   │   ├── services/           # ビジネスロジック (progress, grading, ...)
│   │   ├── repositories/       # Prisma アクセス層
│   │   ├── auth.ts             # requireUser / requireAdmin / getCurrentUser
│   │   └── container.ts        # adapter 選択
│   ├── lib/                    # zod schemas, logger, csv util
│   └── components/             # shadcn/ui composition
├── tests/
└── docs/
```

## 7. 設計原則 (要点)

- **Server Component 優先**: 一覧・集計はすべて Server Component で Prisma 直接呼び出し。
- **Server Action**: フォーム送信・状態変更系。zod でバリデーション。
- **Route Handler**: 動画進捗 (高頻度), Cron, Webhook, CSV ストリーム。
- **レスポンス形式**: `{ ok: true, data } | { ok: false, error: { code, message } }`
- **N+1 回避**: Prisma の `include` / `select` を必ず指定。
- **監査**: 変更系操作はサービス層で `auditPort.write` を呼ぶ。
- **エラー**: 既知エラーは `AppError(code, message, status)` を throw、ハンドラで上記レスポンス形式に変換。
