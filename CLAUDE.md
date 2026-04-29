# LMS — マネージャー向け研修管理システム

## プロジェクト概要
社内マネージャー向け (約 100 名) の動画教材配信・視聴進捗管理・条件付きテスト機能を提供する LMS。内部利用が前提。

## 技術スタック
- **Framework**: Next.js 16 (App Router, TypeScript strict)
- **Runtime**: Vercel Fluid Compute (Node.js 24 LTS) — Edge は使わない
- **Database**: Neon Postgres (Vercel Marketplace)
- **ORM**: Prisma
- **Auth**: Clerk (Vercel Marketplace, ロール = STUDENT / ADMIN)
- **Storage**: Vercel Blob (動画教材, private mode)
- **UI**: shadcn/ui + Tailwind CSS v4
- **テスト**: Vitest, Testing Library, Playwright
- **デプロイ**: Vercel (preview + production)
- **CI**: Vercel Git Integration + GitHub Actions (lint / typecheck / test)
- **Bot 保護**: Vercel BotID (ログイン)
- **メール**: Resend (Vercel Marketplace)

## 開発モード — Mock-First

このプロジェクトは **mock-first** で進める。クリッカブルなモックを最優先で完成させ、本番統合はあとで差し替える。

| 領域 | モック実装 | 本番実装 (Phase 4 で切替) |
| --- | --- | --- |
| Auth | cookie session スタブ (固定ユーザー seed) | Clerk |
| DB | SQLite (Prisma + `file:./dev.db`) | Neon Postgres |
| 動画 | `public/sample.mp4` を全 Lesson で参照 | Vercel Blob (private + 署名付き URL) |
| メール | `console.log` で内容を出力 | Resend |
| Bot 保護 | なし | Vercel BotID |

切替コスト最小化のため、外部依存はインターフェース経由 (`src/server/ports/*`) でアクセスし、アダプタ実装を差し替える形にする。

## エージェント運用ルール
このプロジェクトは Orchestrator + 複数の専門 subagent が分担して開発する。

- 起動した Claude Code セッションは **Orchestrator** として振る舞う
- 専門領域の作業は `.claude/agents/*.md` に定義された subagent へ `Agent` ツール経由で委譲する
- Orchestrator は責務の境界を守り、subagent の領域に直接踏み込まない

### Subagent 一覧
| name | 役割 |
| --- | --- |
| `architect` | 全体設計, ADR, Prisma スキーマ, API 仕様 |
| `backend` | Route Handler / Server Action, repositories, services, 認証認可 |
| `frontend` | 受講者 UI, 管理画面, shadcn/ui コンポーネント |
| `devops` | Vercel 設定, env, Marketplace integration, CI/CD |
| `qa` | Vitest, Playwright, seed |
| `security` | OWASP / 認可漏れ監査 (修正は行わない) |

### 進行フェーズ
- **Phase 0**: 初期化 (本ファイル + `.claude/agents/*` + `docs/`)  ← 完了
- **Phase 1**: `architect` が要件確定, スキーマ, API 仕様, ADR を作成
- **Phase 2**: `architect` 設計に基づき `backend` + `frontend` を並行実装
- **Phase 3**: `qa` がテスト実装, `security` が監査
- **Phase 4**: `devops` が本番デプロイ整備

## ディレクトリ構成 (予定)
```
.
├── CLAUDE.md
├── .claude/agents/           # subagent 定義
├── docs/
│   ├── requirements.md       # 要件
│   ├── architecture.md       # アーキテクチャ (Architect 作成)
│   ├── api-spec.md           # API 仕様 (Architect 作成)
│   └── adr/                  # Architecture Decision Records
├── prisma/schema.prisma      # DB スキーマ
├── src/
│   ├── app/                  # Next.js App Router
│   ├── server/               # services, repositories, auth
│   ├── lib/                  # logger, api-client, util
│   └── components/           # shadcn/ui composition
├── tests/                    # Vitest, Playwright
└── vercel.ts                 # Vercel プロジェクト設定
```

## コーディング規約
- TypeScript strict 必須
- API レスポンスは `{ ok: true, data: T } | { ok: false, error: { code: string, message: string } }`
- Prisma で N+1 を避ける (include / select を必ず指定)
- `console.log` 禁止 (`src/lib/logger.ts` を使う)
- secrets は Vercel env 経由のみ (コミット禁止)
- Server Action / Route Handler は zod でバリデーション
- 認証認可は middleware + `src/server/auth.ts` に集約

## 禁則事項
- main への直接 push 禁止 (PR 必須)
- `node_modules` / `.next` / `.vercel` のコミット禁止
- secrets のコミット禁止
- subagent 責務外の作業 (例: `backend` が UI を書く) 禁止
- Edge Functions は使わない (Fluid Compute Node.js を使う)

## 環境変数
Marketplace integration から自動注入されるものを優先:
- `DATABASE_URL` (Neon)
- `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `BLOB_READ_WRITE_TOKEN` (Vercel Blob)
- `RESEND_API_KEY`
ローカルは `vercel env pull` で `.env.local` に同期。

## テスト
- ユニット: `pnpm test` (vitest run)
- E2E: `pnpm test:e2e` (playwright)
- マイグレーション: `pnpm db:migrate` (prisma migrate dev)

## デプロイ
- preview: PR ごとに Vercel が自動デプロイ
- production: main マージで自動デプロイ
- 重要リリースは Rolling Release を検討 (ADR で判断)
