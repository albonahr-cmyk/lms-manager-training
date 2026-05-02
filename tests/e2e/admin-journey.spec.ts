/**
 * E2E: 管理者ジャーニー
 *
 * admin でログイン → ユーザー作成 → コース作成 → レッスン追加 → 受講者割当
 */
import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

const UNIQUE_SUFFIX = Date.now().toString().slice(-6);

test.describe("管理者ジャーニー", () => {
  test("ユーザー作成 → コース作成 → レッスン追加 → 受講者割当", async ({
    page,
  }) => {
    // 1. 管理者でログイン
    await signIn(page, "admin@example.com");
    await expect(page.getByRole("link", { name: "管理画面" })).toBeVisible();
    await page.getByRole("link", { name: "管理画面" }).click();
    await page.waitForURL("**/admin");

    // 2. ユーザー管理ページへ移動
    await page.getByRole("link", { name: "ユーザー管理" }).click();
    await page.waitForURL("**/admin/users");
    await expect(page.getByRole("heading", { name: "ユーザー管理" })).toBeVisible();

    // 3. ユーザーを 1 名作成
    const testEmail = `e2e-${UNIQUE_SUFFIX}@example.com`;
    const testName = `E2E ユーザー ${UNIQUE_SUFFIX}`;

    // CreateUserForm のラベルで識別
    await page.getByLabel("メールアドレス").fill(testEmail);
    await page.getByLabel("氏名").fill(testName);
    // role は STUDENT がデフォルト
    await page.getByRole("button", { name: "作成 + 招待メール" }).click();

    // 作成成功メッセージが表示される
    await expect(
      page.getByText(new RegExp(`${testName}.*を作成しました`)),
    ).toBeVisible({ timeout: 10000 });

    // 4. コース管理ページへ移動 (直接 URL アクセス)
    await page.goto("/admin/courses");
    await page.waitForURL("**/admin/courses");

    // 5. コースを 1 つ作成
    const courseTitle = `E2E コース ${UNIQUE_SUFFIX}`;
    await page.getByLabel("タイトル").fill(courseTitle);
    await page.getByRole("button", { name: "コースを作成" }).click();

    // コース詳細ページにリダイレクト (createCourseAction は redirect を呼ぶ)
    await page.waitForURL("**/admin/courses/**", { timeout: 15000 });

    // コース詳細ページが表示される
    await expect(page.getByRole("heading", { name: courseTitle })).toBeVisible({
      timeout: 10000,
    });

    // 6. レッスンを追加 (id="new-lesson-title" の Input で識別)
    await page.locator("#new-lesson-title").fill(`E2E レッスン ${UNIQUE_SUFFIX}`);
    await page.getByRole("button", { name: "レッスン追加" }).click();

    // レッスンが追加された (テーブルに表示される)
    await expect(
      page.getByText(`E2E レッスン ${UNIQUE_SUFFIX}`),
    ).toBeVisible({ timeout: 10000 });

    // 7. 受講者を割り当てる
    // 作成したユーザーが「未割当のユーザー」リストに表示される
    // チェックボックスをチェック (label 要素内のチェックボックス)
    const userCheckbox = page.getByLabel(new RegExp(testName));
    await expect(userCheckbox).toBeVisible({ timeout: 5000 });
    await userCheckbox.check();

    // 割り当てボタンをクリック
    await page.getByRole("button", { name: "選択ユーザーに割り当て" }).click();

    // 割り当て成功メッセージが表示される
    await expect(
      page.getByText(/\d 件割り当てました/),
    ).toBeVisible({ timeout: 10000 });
  });
});
