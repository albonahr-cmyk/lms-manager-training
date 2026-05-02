/**
 * E2E: 認可テスト
 *
 * 受講者 (student) が /admin にアクセスすると /forbidden か /sign-in にリダイレクトされる。
 */
import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("認可: 受講者による /admin アクセス拒否", () => {
  test("student1 でログインして /admin にアクセスすると /forbidden にリダイレクトされる", async ({
    page,
  }) => {
    await signIn(page, "student1@example.com");

    // /admin に直接アクセス
    await page.goto("/admin");

    // /forbidden または /sign-in にリダイレクトされることを確認
    await expect(page).toHaveURL(/\/(forbidden|sign-in)/);
  });

  test("未ログイン状態で /admin にアクセスすると /sign-in にリダイレクトされる", async ({
    page,
  }) => {
    // Cookie をクリアして未ログイン状態にする
    await page.context().clearCookies();

    await page.goto("/admin");

    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("未ログイン状態で /dashboard にアクセスすると /sign-in にリダイレクトされる", async ({
    page,
  }) => {
    await page.context().clearCookies();

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/sign-in/);
  });
});
