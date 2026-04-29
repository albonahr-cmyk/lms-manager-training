# 確定事項一覧

> Phase 1 でユーザーと合意した 6 項目。`docs/requirements.md` §6 の代替。
> Date: 2026-04-29 / Author: architect subagent

## 1. 認証 (パスワードポリシー / MFA)

- **決定事項**: Clerk の既定パスワードポリシーを採用。MFA はオプション (ユーザー任意有効化)。
- **モック挙動**: cookie session スタブ + 固定 seed ユーザー (例: `student@example.com` / `admin@example.com`)。パスワード検証は seed 値との文字列比較。MFA なし。
- **本番挙動**: Clerk の sign-in / sign-up フロー。BotID で sign-in を保護。MFA は Clerk 設定で opt-in 可能に。
- **切替時の作業**:
  - `src/server/adapters/stub/auth.ts` を `prod/clerk-auth.ts` に切替
  - Clerk Webhook (`/api/webhooks/clerk`) で `User` テーブルと同期
  - middleware で BotID を sign-in route に適用

## 2. 動画形式 / サイズ上限

- **決定事項**: mp4 (H.264 + AAC)。1 ファイル 2 GB 上限。
- **モック挙動**: 全 Lesson が `public/sample.mp4` を参照 (`Lesson.videoUrl = "/sample.mp4"`)。アップロード UI なし、seed のみ。
- **本番挙動**: ADMIN がアップロード → Vercel Blob (private)。再生は署名 URL を発行。バリデーションで MIME / サイズチェック。
- **切替時の作業**:
  - `src/server/ports/storage.ts` の `getSignedUrl(key)` / `createUploadUrl()` を `prod/blob.ts` で実装
  - 管理画面に Blob 直 PUT 用のアップロード UI 追加
  - `Lesson.videoUrl` を blob URL に置換するマイグレーション seed を入れ替え

## 3. テスト挙動

- **決定事項**:
  - 設問シャッフル ON 固定、選択肢シャッフル ON 固定 (`Test.shuffleQuestions = true` / `shuffleChoices = true` をデフォルト)
  - タイムリミットはテストごと任意設定 (`Test.timeLimitSec` は null 可)
  - 部分点なし (問題ごとの正解集合と完全一致のみ正解)
  - 提出後に解説 (`Question.explanation`) を表示
- **モック挙動**: 上記そのまま。タイムリミットはサーバー側で開始時刻と比較し、超過提出時は自動採点で不正解扱い。
- **本番挙動**: 同じ。
- **切替時の作業**: なし。

## 4. メール

- **決定事項**: 送信タイミングは 3 種類のみ。
  - 招待メール (ユーザー作成時)
  - 課題割当メール (Enrollment 作成時)
  - 期限 7 日前リマインダ (未完了者のみ、Vercel Cron で日次)
- **モック挙動**: `mailPort.send()` が `console.log` で内容を出力。Cron も `/api/cron/reminders` をローカルで手動叩いて確認。
- **本番挙動**: Resend SDK を使用。Cron は `vercel.json` の `crons` に登録、`Authorization: Bearer $CRON_SECRET` で保護。
- **切替時の作業**:
  - `src/server/adapters/prod/mail.ts` を Resend SDK で実装
  - メールテンプレート (招待 / 割当 / リマインダ) 整備
  - `vercel.json` に cron 定義 + `CRON_SECRET` を env に追加

## 5. 集計粒度

- **決定事項**: リアルタイム集計。バッチなし。
- **モック挙動**: `/admin/dashboard` (Server Component) が Prisma 集計クエリ (`groupBy`, `count`, `aggregate`) を発行して描画。
- **本番挙動**: 同じ。100 ユーザー規模ではリアルタイムで十分。
- **切替時の作業**: なし。負荷増大時は Vercel Cache (`use cache`) を導入する余地あり。

## 6. 動画完了率判定

- **決定事項**: デフォルト 95% 視聴で完了。Lesson 単位で `requiredCompletionRate Float?` で上書き可能。
- **モック挙動**: `progressService` が `watchedSec / durationSec >= (lesson.requiredCompletionRate ?? 0.95)` を満たした時点で `Progress.completed = true`。
- **本番挙動**: 同じ。
- **切替時の作業**: なし。
