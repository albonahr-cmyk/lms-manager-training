/**
 * E2E テスト共通ヘルパー
 */
import type { Page } from "@playwright/test";

/**
 * サインインする。パスワードは任意の文字列で OK (stub auth)。
 */
export async function signIn(page: Page, email: string): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード").fill("password");
  await page.getByRole("button", { name: "サインイン" }).click();
  // dashboard へのリダイレクトを待つ
  await page.waitForURL("**/dashboard");
}

/**
 * サインアウトする。
 */
export async function signOut(page: Page): Promise<void> {
  await page.getByRole("button", { name: "サインアウト" }).click();
  await page.waitForURL("**/sign-in");
}
