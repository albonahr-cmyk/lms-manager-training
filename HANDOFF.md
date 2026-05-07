# 引継ぎドキュメント

> 最終更新: 2026-05-07
> このドキュメントは **次の担当者向け** に、現状 / 引き継ぎ手順 / 完了済み作業 / 未完了 TODO をまとめたものです。

---

## 30 秒サマリ

社内マネージャー研修 LMS を Mock-first で構築。
Sprint #1〜#5 で **セキュリティ + UX 整備の punch list 30 件を全消化**、Sprint #6 で **教材データを Spreadsheet 化**、Sprint #7 で **Notion 全 DB 化を設計** (実装まで完了 / 未デプロイ)、その後 **Vercel + Neon Postgres で本番デプロイ → ログイン動作確認まで完了**。

- **コード品質**: ✅ tsc クリーン / 244 tests pass / PR 6 件マージ済
- **ローカル動作**: ✅ `pnpm dev` で完全に動く
- **本番デプロイ**: ✅ https://lms-manager-training.vercel.app で動作中 (Neon Postgres + シードユーザー投入済)
- **本番ログイン**: ✅ `admin@example.com` / 任意のパスワードで通過

---

## 🤝 共同開発者への引き継ぎ手順

### Step 1. GitHub の共同開発設定 (オーナーの作業)

1. 部下の **GitHub username** をヒアリング (例: `tanaka-foo`)
2. ブラウザで開く: `https://github.com/kohnosuken-tech/lms-manager-training/settings/access`
3. 「**Add people**」をクリック → username 入力 → 「**Write**」権限で招待
4. 部下が GitHub 通知から Accept → 共同編集可能に

### Step 2. Vercel の権限を移管 (3 つの選択肢)

| 方法 | やること | メリット | デメリット |
|---|---|---|---|
| (A) **Team に部下を招待** | 今のあなたの Vercel に Member として追加 | 移行不要、すぐ共同編集可 | 課金は今のオーナー持ち |
| (B) **Project Transfer** ⭐ | 部下の Vercel に丸ごと転送 | オーナーが部下になる、env / Postgres ごと移管 | 一度切替が必要 |
| (C) **部下が再 Import** | 部下が GitHub から Import し直す | クリーン | env / Postgres は再設定必要 |

#### (B) 推奨手順
1. 部下が Vercel アカウントを作成 (https://vercel.com/signup → GitHub 連携)
2. オーナーが `https://vercel.com/kohnosuken-techs-projects/lms-manager-training/settings/advanced` を開く
3. 一番下の「**Transfer Project**」 → 部下の Team / Personal を選択
4. 部下が承認 → Postgres も含めて完全移管

### Step 3. 部下が最初にやること (ローカル開発立ち上げ)

```bash
# 1. clone
git clone https://github.com/kohnosuken-tech/lms-manager-training.git
cd lms-manager-training

# 2. 依存インストール (pnpm 推奨)
pnpm install

# 3. ローカル Postgres を起動 (Docker が楽)
docker run -d --name lms-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16

# 4. 環境変数を作成
cp .env.example .env.local
# 最低限以下を設定:
#   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lms
#   SESSION_SECRET=任意の32文字以上の文字列
#   APP_MODE=development

# 5. スキーマ適用 + シード
pnpm prisma db push
pnpm db:seed

# 6. 起動
pnpm dev
# → http://localhost:3000
# → admin@example.com / 任意のパスワード でログイン
```

### Step 4. 開発フロー (運用ルール)

- `main` 直 push 禁止 → feature ブランチを切って PR
- Vercel が PR ごとに **preview URL を自動生成** するのでそこで動作確認
- main マージで **本番自動デプロイ**
- Claude Code を使う場合は `CLAUDE.md` のエージェント運用ルールに従う

---

## ⚠️ できていないこと一覧 (引き継ぎ時の TODO)

### 🔴 重要 (本番運用に必要)
- [ ] **本番の認証連携** — 今は自前 cookie session スタブ。Clerk / Auth0 等への差し替えが未実装
- [ ] **パスワード認証** — 現状は「メアド + 任意のパスワード」で通る (mock-first 設計)
- [ ] **メール送信の本番化** — 今は `console.log` 出力のみ。Resend などへ切替必要
- [ ] **動画ストレージ** — 今は `public/sample.mp4` を全レッスンで参照。Vercel Blob (private + 署名付き URL) 切替が未実装
- [ ] **CMS データの本格運用** — Course / Lesson / Test は今 TSV fixture 経由。Notion 連携の実装は完了済みだが未デプロイ (`docs/notion-setup.md` 参照)
- [ ] **本番ユーザー登録フロー** — ログインはできるが新規ユーザー追加 UI なし (DB に直接 INSERT が必要)

### 🟡 機能的に未実装
- [ ] **テスト機能の管理画面** — 受講側はあるが ADMIN が問題を作る UI なし
- [ ] **進捗 CSV エクスポート** — 仕様書には書いたが UI 未実装
- [ ] **受講期限通知メール** — メールテンプレートはあるが Cron 未設定

### 🟢 品質改善
- [ ] **E2E テスト全 pass 確認** — Postgres 移行後の動作確認が必要 (`pnpm test:e2e`)
- [ ] **本番 Postgres のバックアップ** — Neon は自動だが世代管理は要確認
- [ ] **エラーモニタリング** — Sentry 等の導入が未
- [ ] **`tests/unit/services/audit.spec.ts` の順序依存バグ修正** — 単独実行は通るが全体実行で稀に失敗

### 📦 開発体験
- [ ] **GitHub Actions の test workflow 動作確認** — Postgres service 追加済みだが実機で未検証
- [ ] **PR テンプレ / Issue テンプレ** — 未作成
- [ ] **Branch protection rules** — main への直 push を禁止する GitHub 設定が未適用

---

## ✅ 完了している作業

### Sprint #1〜#5
| Sprint | 内容 |
| --- | --- |
| #1+#2 | Critical 4 件 (動画 public 露出 / Upload CSRF / CSV インジェクション / VideoPlayer エラー黙殺) + UX 基盤 (sonner Toaster / AlertDialog / shadcn Select-Checkbox-RadioGroup / RequiredLabel / EmptyState / Skeleton / loading.tsx) + デザイン刷新 (ミントグリーン化) + YouTube duration 自動取得 |
| #3 | SEC High 5 (brute force / sessionVersion / cron secret / 監査 PII / IDOR) + UX High 5 (検索フィルタ / テスト誘導 CTA / 分入力 / モバイル / a11y) |
| #4 | SEC Medium 5 (CSP nonce / SSRF / Admin progress / testId 整合 / AppError 統一) + Low 4 + UX Medium 4 |
| #5 | LessonRow Sheet 化 + AuditLog hash chain (改ざん検知) |

### Sprint #6 — Spreadsheet/GAS 統合
- 教材データを **Google Spreadsheet** に
- ユーザー / 進捗 / 監査ログは Prisma 側
- メール送信は **GAS Web App relay** (HMAC + idempotency)
- 環境変数 `CMS_SOURCE` / `MAIL_DRIVER` で切替

### Sprint #7 — Notion 全 DB 化 (実装完了 / 未デプロイ)
- ✅ Phase F: architect 設計完了 (`docs/adr/0006-*.md` / `docs/architecture.md` §11 / `docs/notion-setup.md`)
- ✅ Phase G2: backend 実装完了 (`scripts/setup-notion.ts` + 11 entity adapter + token bucket + write queue + cache)
- ⏸ Phase G1: ユーザー作業 (Notion で integration 作成 + 親ページ connect) — 権限不足で停止
- ⏳ Phase G3-G5: qa / Vercel デプロイ / 会社 Notion 切替 — 未着手

### Vercel + Neon Postgres デプロイ (今回完了分)
- ✅ Prisma を SQLite → Postgres に移行 (PR #4)
- ✅ migration の警告行除去 (PR #5)
- ✅ build を `prisma db push` に変更 (PR #6)
- ✅ Vercel 環境変数を 7 件設定 (SESSION_SECRET / UPLOAD_SIGNING_SECRET / APP_MODE / CMS_SOURCE / GAS_WEBAPP_URL / GAS_SECRET / MAIL_DRIVER)
- ✅ Neon Postgres にシードユーザー (admin + student × 3) 投入
- ✅ 本番ログイン動作確認

---

## 🏗 アーキテクチャ (現在)

```
┌─────────────────────────────────────────────────────────┐
│  Next.js App (Vercel Fluid Compute / Node.js 24)        │
└──────┬──────────────────┬──────────────────┬───────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│ ports/cms    │  │ ports/users  │  │ ports/audit      │
│ ports/test   │  │ ports/enroll │  │ ports/mail       │
│ ports/answer │  │ ports/prog   │  │ ports/storage    │
└──────┬───────┘  └──────┬───────┘  └──────┬───────────┘
       │                  │                  │
       │ adapters/{notion,local,spreadsheet,sqlite,stub}
       │ で切替可
       ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│ TSV fixture  │  │ Neon         │  │ console.log      │
│ (現運用)     │  │ Postgres     │  │ (現運用)          │
│              │  │ (User/Prog/  │  │                   │
│              │  │  Audit)      │  │                   │
└──────────────┘  └──────────────┘  └──────────────────┘
```

切替軸 (環境変数):
- `DATA_DRIVER=sqlite-spreadsheet` (default) — 既存
- `DATA_DRIVER=notion` — 全 Port を Notion adapter に切替 (実装済 / 未稼働)
- `CMS_SOURCE=local|spreadsheet|notion`
- `MAIL_DRIVER=stub|gas|resend`

---

## ⚠️ 既知の制約 / 注意点

### Notion 全 DB 化を進める場合の性能制約
- Notion API: **3 req/秒** がアプリ全体の上限
- → 100 名同時動画視聴は不可、30 名同時程度が現実的
- → 50 名同時テスト受験は採点に数分かかる

### トランザクションなし (Notion / Spreadsheet 採用時)
- テスト提出途中でエラーが起きると **一部だけ書き込まれる** リスク
- → Submission 全体をまず作って status=IN_PROGRESS、Answer を順次作成、最後に PASSED/FAILED に更新する設計で軽減

### 本番運用時の留意
- 現在は **mock-first 状態** で本番動作している (パスワード認証なし、メール送信なし、動画はサンプル)
- 実運用前に「🔴 重要」TODO を消化必要

---

## 🛠 開発フロー詳細

### Subagent 運用 (Claude Code 利用時)
| name | 役割 |
| --- | --- |
| `architect` | 設計, ADR, スキーマ, API 仕様 |
| `backend` | Server Action, Route Handler, services, repositories |
| `frontend` | RSC ページ, shadcn/ui コンポーネント |
| `devops` | Vercel, env, CI/CD |
| `qa` | Vitest, Playwright |
| `security` | OWASP / 認可監査 |

`CLAUDE.md` に詳細あり。

---

## 📞 リソース / リンク

- リポジトリ: https://github.com/kohnosuken-tech/lms-manager-training
- 本番: https://lms-manager-training.vercel.app
- 過去の PR (議論履歴): https://github.com/kohnosuken-tech/lms-manager-training/pulls?q=is%3Apr
- ADR (意思決定の経緯): `docs/adr/` 配下を 0001 から順に
- Notion 移行手順: `docs/notion-setup.md`

---

## 🚀 引き継ぎ後の推奨ファーストアクション

1. **`README.md` を読む** (5 分) → 起動手順を試す
2. **このファイル (HANDOFF.md) を読む** (10 分) → 全体像を把握
3. **ローカルで `pnpm dev` 起動 + 受講者 / 管理画面を触る** (15 分) → 機能の現物確認
4. **「🔴 重要」TODO から優先度を決める**
5. **小さい PR で慣らし運転** → 例: README typo 修正 / `Branch protection rules` 設定など

合計 1 時間で引き継ぎ完了できる構成にしてあります。
