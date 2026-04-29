# API 仕様 (一覧)

> Server Action (SA) と Route Handler (RH) の一覧。各行 1 行記述。詳細スキーマは省略。
> レスポンス形式: `{ ok: true, data } | { ok: false, error: { code, message } }`

## 1. 認証 (受講者・ADMIN 共通)

| 種別 | パス / 関数 | 引数 | 戻り値 | 概要 |
| --- | --- | --- | --- | --- |
| SA | `signInAction` | `{ email, password }` | `{ userId }` | サインイン (cookie 設定) |
| SA | `signOutAction` | `()` | `void` | cookie 破棄 |
| RH | `GET /api/me` | — | `{ user }` | 現在のセッションユーザー取得 |

## 2. 受講者向け

| 種別 | パス / 関数 | 引数 | 戻り値 | 概要 |
| --- | --- | --- | --- | --- |
| SC | `/dashboard` (page) | — | HTML | 担当コース一覧 + 進捗 |
| SC | `/courses/[id]` | `{ id }` | HTML | コース詳細・Lesson 一覧 |
| SC | `/courses/[id]/lessons/[lessonId]` | `{ id, lessonId }` | HTML | 動画再生ページ |
| RH | `POST /api/progress` | `{ lessonId, watchedSec, lastPositionSec }` | `{ completed }` | 視聴進捗を 10 秒間隔で保存 |
| SA | `startTestAction` | `{ testId }` | `{ submissionId }` | テスト受験開始 (Submission 作成) |
| SA | `submitTestAction` | `{ submissionId, answers: [{ questionId, choiceIds }] }` | `{ score, status }` | テスト提出・自動採点 |
| SC | `/tests/[id]` | `{ id }` | HTML | テスト受験画面 (シャッフル済み問題) |
| SC | `/submissions/[id]` | `{ id }` | HTML | 結果 + 解説表示 |

## 3. 管理者向け (ADMIN)

### 3.1 ユーザー管理

| 種別 | パス / 関数 | 引数 | 戻り値 | 概要 |
| --- | --- | --- | --- | --- |
| SC | `/admin/users` | — | HTML | ユーザー一覧 |
| SA | `createUserAction` | `{ email, name, role }` | `{ userId }` | ユーザー個別作成 + 招待メール |
| SA | `bulkCreateUsersAction` | `{ csv: string }` | `{ created, errors }` | CSV 一括作成 |
| SA | `deactivateUserAction` | `{ userId }` | `void` | 無効化 (論理削除) |
| SA | `changeRoleAction` | `{ userId, role }` | `void` | ロール変更 |

### 3.2 コース / レッスン管理

| 種別 | パス / 関数 | 引数 | 戻り値 | 概要 |
| --- | --- | --- | --- | --- |
| SC | `/admin/courses` | — | HTML | コース一覧 |
| SA | `createCourseAction` | `{ title, description, order }` | `{ courseId }` | コース作成 |
| SA | `updateCourseAction` | `{ id, ...patch }` | `void` | コース更新 |
| SA | `publishCourseAction` | `{ id, published }` | `void` | 公開切替 |
| SA | `createLessonAction` | `{ courseId, title, videoUrl, durationSec, order, blockSeek, requiredCompletionRate? }` | `{ lessonId }` | レッスン作成 |
| SA | `updateLessonAction` | `{ id, ...patch }` | `void` | レッスン更新 |
| SA | `deleteLessonAction` | `{ id }` | `void` | レッスン削除 |
| RH | `POST /api/admin/upload-url` | `{ filename, contentType, sizeBytes }` | `{ uploadUrl, blobUrl }` | (Phase4) Vercel Blob 署名 URL 発行。モックは `/sample.mp4` 固定を返す |

### 3.3 受講割当 (Enrollment)

| 種別 | パス / 関数 | 引数 | 戻り値 | 概要 |
| --- | --- | --- | --- | --- |
| SA | `assignCourseAction` | `{ userIds, courseId, dueAt? }` | `{ assigned }` | コース割当 + 課題割当メール |
| SA | `unassignCourseAction` | `{ userId, courseId }` | `void` | 割当解除 |

### 3.4 テスト管理

| 種別 | パス / 関数 | 引数 | 戻り値 | 概要 |
| --- | --- | --- | --- | --- |
| SC | `/admin/tests` | — | HTML | テスト一覧 |
| SA | `createTestAction` | `{ courseId, title, prerequisiteCourseId?, passingScore, maxAttempts, timeLimitSec? }` | `{ testId }` | テスト作成 |
| SA | `updateTestAction` | `{ id, ...patch }` | `void` | テスト更新 |
| SA | `publishTestAction` | `{ id, published }` | `void` | 公開切替 |
| SA | `addQuestionAction` | `{ testId, type, prompt, explanation, choices: [{ label, correct }] }` | `{ questionId }` | 設問追加 |
| SA | `updateQuestionAction` | `{ id, ...patch }` | `void` | 設問更新 |
| SA | `deleteQuestionAction` | `{ id }` | `void` | 設問削除 |

### 3.5 ダッシュボード / レポート

| 種別 | パス / 関数 | 引数 | 戻り値 | 概要 |
| --- | --- | --- | --- | --- |
| SC | `/admin/dashboard` | — | HTML | 受講率・合格率・未完了者一覧 (Prisma 集計, リアルタイム) |
| RH | `GET /api/admin/export?type=users` | `?type` | `text/csv` | ユーザー CSV |
| RH | `GET /api/admin/export?type=courses` | — | `text/csv` | コース CSV |
| RH | `GET /api/admin/export?type=progress` | `?courseId?` | `text/csv` | 進捗 CSV |

### 3.6 監査ログ

| 種別 | パス / 関数 | 引数 | 戻り値 | 概要 |
| --- | --- | --- | --- | --- |
| SC | `/admin/audit` | `?cursor?&action?` | HTML | 監査ログ閲覧 (ページネーション) |

## 4. システム (cron / webhook)

| 種別 | パス | 引数 | 戻り値 | 概要 |
| --- | --- | --- | --- | --- |
| RH | `POST /api/cron/reminders` | header `Authorization: Bearer $CRON_SECRET` | `{ sent }` | 課題期限 7 日前リマインダ (未完了者のみ, 日次) |
| RH | `POST /api/webhooks/clerk` | Clerk webhook payload | `void` | (Phase4) Clerk → User 同期 |

## 5. 共通エラーコード

| code | 意味 |
| --- | --- |
| `UNAUTHENTICATED` | 未ログイン |
| `FORBIDDEN` | 権限不足 |
| `NOT_FOUND` | 対象なし |
| `VALIDATION_FAILED` | zod バリデーション失敗 |
| `CONFLICT` | 一意制約違反など |
| `RATE_LIMITED` | (将来) レート制限 |
| `SEEK_BLOCKED` | 早送り抑止違反 |
| `ATTEMPTS_EXCEEDED` | 再受験上限超過 |
| `PREREQUISITE_NOT_MET` | 受講条件未達 |
| `INTERNAL` | 想定外エラー |
