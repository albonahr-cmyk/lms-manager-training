/**
 * csvCell の Formula Injection エスケープテスト
 *
 * export.ts の csvCell 関数は private なので、buildUsersCsv 経由で観測する。
 * 各種インジェクションキャラクタ (=, +, -, @, タブ, CR) が ' プレフィクスされるかを確認する。
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { testPrisma, resetDb } from "../../helpers/db";
import { buildUsersCsv } from "@/server/services/export";

// DATABASE_URL=file:./prisma/test.db は vitest.config.ts の env で設定済み
// globalThis.__prisma__ 経由で testPrisma と同一インスタンスが使われる

async function createUserWithName(name: string, emailSuffix: string) {
  await testPrisma.user.create({
    data: {
      email: `inject${emailSuffix}@example.com`,
      name,
      role: "STUDENT",
    },
  });
}

describe("buildUsersCsv — csvCell Formula Injection エスケープ", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("= で始まる名前には ' プレフィクスが付く", async () => {
    await createUserWithName("=SUM(A1)", "eq");
    const csv = await buildUsersCsv();
    expect(csv).toContain("'=SUM(A1)");
  });

  it("+ で始まる名前には ' プレフィクスが付く", async () => {
    await createUserWithName("+1234", "plus");
    const csv = await buildUsersCsv();
    expect(csv).toContain("'+1234");
  });

  it("- で始まる名前には ' プレフィクスが付く", async () => {
    await createUserWithName("-1234", "minus");
    const csv = await buildUsersCsv();
    expect(csv).toContain("'-1234");
  });

  it("@ で始まる名前には ' プレフィクスが付く", async () => {
    await createUserWithName("@malicious", "at");
    const csv = await buildUsersCsv();
    expect(csv).toContain("'@malicious");
  });

  it("タブ (\\t) で始まる名前には ' プレフィクスが付く", async () => {
    await createUserWithName("\tTAB", "tab");
    const csv = await buildUsersCsv();
    expect(csv).toContain("'\tTAB");
  });

  it("CR (\\r) で始まる名前には ' プレフィクスが付く", async () => {
    await createUserWithName("\rCR", "cr");
    const csv = await buildUsersCsv();
    expect(csv).toContain("'\rCR");
  });

  it("通常の名前 (アルファベット始まり) にはプレフィクスが付かない", async () => {
    await createUserWithName("普通の名前", "normal");
    const csv = await buildUsersCsv();
    expect(csv).toContain("普通の名前");
    // ' プレフィクスは付いていない
    expect(csv).not.toContain("'普通の名前");
  });

  it("カンマを含む値はダブルクォートで囲まれる", async () => {
    await createUserWithName("田中,一郎", "comma");
    const csv = await buildUsersCsv();
    expect(csv).toContain('"田中,一郎"');
  });
});
