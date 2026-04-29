# 0001. Mock-first 戦略

- Status: Accepted
- Date: 2026-04-29
- Author: architect subagent

## Context

100 ユーザー規模・社内利用の LMS を Phase 4 までに本番投入する。現時点では:

- Vercel / Clerk / Neon / Resend / Blob などの **外部サービス契約状況が未確定**。
- ステークホルダーへの早期デモが必要 (UX レビュー)。
- 仕様の細部 (UI フロー、テスト体験、進捗表示) は触ってみないと固まらない。

「実 SaaS と統合してから UI を作る」順序だと、契約・OAuth 設定・本番マイグレーションの待ちが各フェーズに挟まり、UI レビューの開始が大幅に遅れる。

## Decision

**Mock-first** で開発する。Phase 1〜3 は外部 SaaS への接続を一切持たない状態でクリッカブルなアプリを完成させ、Phase 4 で実装を差し替える。

実現手段は **ports & adapters**:

- `src/server/ports/*.ts` に **interface** を定義 (`AuthPort`, `MailPort`, `StoragePort`, `LoggerPort`)。
- `src/server/adapters/stub/*.ts` にモック実装、`adapters/prod/*.ts` に本番実装。
- `src/server/container.ts` が `process.env.APP_MODE` (`stub` | `prod`) を見て解決。
- 呼び出し側 (services / route handlers / server components) は port のみ参照。アダプタ差替で呼び出し側の変更は発生しない。

スタブ対象:

| 領域 | スタブ |
| --- | --- |
| Auth | cookie session + seed ユーザー (固定 ID) |
| DB | SQLite (`file:./dev.db`)。Prisma schema の `provider` は `postgresql` を維持 |
| 動画 | `public/sample.mp4` を全 Lesson で参照 |
| メール | `console.log` 出力 |
| Bot 保護 | なし |
| Cron | 手動で `/api/cron/reminders` を curl で叩く |

## 各スタブの本番切替手順

| スタブ | 切替手順 |
| --- | --- |
| Auth | (1) Clerk アカウント作成 (2) `adapters/prod/clerk-auth.ts` を実装 (3) `/api/webhooks/clerk` で User 同期 (4) middleware で BotID 適用 (5) `APP_MODE=prod` |
| DB | (1) Neon 作成 (2) `DATABASE_URL` を Neon URL に切替 (3) `prisma migrate deploy` (4) seed は本番では実行しない |
| 動画 | (1) `BLOB_READ_WRITE_TOKEN` 設定 (2) `adapters/prod/blob-storage.ts` 実装 (3) 管理画面に upload UI 追加 (4) 既存 Lesson のレコードを Blob URL に書き換えるバックフィル |
| メール | (1) Resend ドメイン認証 (2) `adapters/prod/resend-mail.ts` 実装 (3) HTML テンプレート整備 (4) `RESEND_API_KEY` 設定 |
| Bot 保護 | sign-in route に Vercel BotID middleware 適用 |
| Cron | `vercel.json` に `crons` 追加, `CRON_SECRET` を env へ |

## Consequences

### 良い影響
- UI / UX レビューを **外部契約完了を待たずに** 開始できる。
- Adapter 境界が型で強制されるため、後工程での結合度が下がる。
- テストでは常に stub adapter を使え、外部 SaaS への依存ゼロ。

### 悪い影響 / トレードオフ
- 本番実装で初めて発覚する制約 (Clerk のクレーム形式、Blob のアップロード制限等) があり得る。
- adapter 2 系統を保守する必要があり、port 設計を誤ると差替時に痛む。
- SQLite / Postgres の方言差 (大文字小文字、Json 型、外部キーの動作差) を意識する必要あり。
  → 本 ADR では Json 型を使わず文字列 + zod パース、`@db.*` ディレクティブも付けないルールで吸収する。

### 将来の拡張に与える影響
- Phase 4 の差替コストを最小化する設計のため、追加 SaaS (例: 通知先を Slack に拡張) も同じ port パターンで容易に追加できる。

## Alternatives considered

- **本番統合先行**: 早期に Clerk / Neon を契約して本番 stack で開発する。
  - 不採用理由: 契約・設定の待ちが UI レビューを遅らせる。社内利用なので外部公開のリスクは低いが、ベンダ依存を早期に固定するのも避けたい。
- **Mock を本番コード内分岐 (`if (process.env.APP_MODE === 'stub')`) で実現**:
  - 不採用理由: 業務ロジックに環境分岐が散らばり、テスト・読みやすさ・差替性が劣化する。Ports & Adapters のほうがクリーン。

## リスクと緩和

| リスク | 緩和 |
| --- | --- |
| Stub と本番で挙動差 | port の戻り値型を厳密に揃え、stub にもエラーケースを実装 |
| Phase 4 差替が大規模になる | port を最小 API に絞り、adapter ごとに統合テストを用意 |
| SQLite / Postgres 差 | Prisma schema を Postgres 前提で書き、Json 型・`@db.*` を使わない |
