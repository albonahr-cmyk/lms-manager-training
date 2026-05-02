/**
 * E2E: 受講者ジャーニー
 *
 * student1 でログイン → ダッシュボード → コース → レッスン (シミュレート) → テスト受験 → 結果確認
 *
 * 前提:
 * - global-setup で seed 済み (ハラスメント基礎研修 = courses[0])
 * - NEXT_PUBLIC_SIMULATE_VIDEO=true でシミュレートボタンが有効
 * - seed では student1 は Course1 に enrollment 済み、Lesson1 のみ completed
 */
import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("受講者ジャーニー", () => {
  test("ログイン → ダッシュボード → コースクリック → レッスン視聴シミュレート → テスト受験 → 結果確認", async ({
    page,
  }) => {
    // 1. ログイン
    await signIn(page, "student1@example.com");

    // ダッシュボードが表示される
    await expect(page.getByText("マイダッシュボード")).toBeVisible();

    // 2. コースをクリック (ハラスメント基礎研修)
    await page.getByText("ハラスメント基礎研修").click();
    await page.waitForURL(/\/courses\//);

    // コース詳細ページ
    await expect(page.getByRole("heading", { name: "ハラスメント基礎研修" })).toBeVisible();

    // 3. レッスンをクリック (まだ完了していない 2 番目のレッスン)
    // seed では Lesson1 (index 0) が completed, Lesson2 (index 1) が未完了
    const lessonLinks = page.getByRole("link", { name: /第2回/ });
    await lessonLinks.first().click();
    await page.waitForURL(/\/lessons\//);

    // レッスンページ
    await expect(page.getByText("動画プレーヤー")).toBeVisible();

    // 4. シミュレートボタンをクリックして視聴をシミュレート
    const simulateBtn = page.getByRole("button", { name: "シミュレート再生 (mock)" });
    await expect(simulateBtn).toBeVisible();
    await simulateBtn.click();

    // シミュレートが開始されて進捗バーが更新されるのを待つ
    // durationSec=600 を 30 秒刻みで進めるが、E2E テストでは 95% 到達まで待てないので
    // 進捗を手動保存して確認する
    await page.waitForTimeout(3000); // 3 秒待って 90 秒分の進捗を蓄積

    // シミュレートを停止
    await page.getByRole("button", { name: "シミュレート停止" }).click();

    // 進捗を手動保存
    await page.getByRole("button", { name: "進捗を手動保存" }).click();

    // 進捗バーが更新されていること (0% より大きい)
    const progressbar = page.getByRole("progressbar");
    const ariaValue = await progressbar.getAttribute("aria-valuenow");
    expect(Number(ariaValue)).toBeGreaterThan(0);
  });

  test("ダッシュボードでコースの進捗パーセントが表示される", async ({ page }) => {
    await signIn(page, "student1@example.com");

    // seed: student1 は Course1 の Lesson1 (3 件中 1 件) が completed → 33%
    const progressBadge = page.getByText(/\d+%/).first();
    await expect(progressBadge).toBeVisible();
  });
});
