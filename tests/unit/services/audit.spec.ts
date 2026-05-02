/**
 * listAuditLogs の cursor ページネーション動作テスト
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { testPrisma, resetDb } from "../../helpers/db";
import { listAuditLogs } from "@/server/services/audit";

// DATABASE_URL=file:./prisma/test.db は vitest.config.ts の env で設定済み

async function seedAuditLogs(count: number): Promise<string[]> {
  const user = await testPrisma.user.create({
    data: { email: "auditor@example.com", name: "監査者", role: "ADMIN" },
    select: { id: true },
  });

  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    // 各ログに異なる timestamp を設定
    const at = new Date(Date.now() - (count - i) * 1000);
    const log = await testPrisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "USER_LOGIN",
        target: `User:${user.id}`,
        diff: JSON.stringify({ i }),
        at,
      },
      select: { id: true },
    });
    ids.push(log.id);
  }
  return ids;
}

describe("listAuditLogs", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("cursor なし: limit=2 で最新 2 件が返る", async () => {
    await seedAuditLogs(5);

    const result = await listAuditLogs({ limit: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).not.toBeNull();
  });

  it("cursor あり: cursor 以降の古いレコードが取得できる", async () => {
    await seedAuditLogs(5);

    // 最初のページ
    const first = await listAuditLogs({ limit: 2 });
    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).not.toBeNull();

    // 2 ページ目
    const second = await listAuditLogs({ limit: 2, cursor: first.nextCursor! });
    expect(second.items).toHaveLength(2);

    // ページが重複していないこと
    const firstIds = new Set(first.items.map((i) => i.id));
    for (const item of second.items) {
      expect(firstIds.has(item.id)).toBe(false);
    }
  });

  it("全件が limit 以下のとき nextCursor は null になる", async () => {
    await seedAuditLogs(3);

    const result = await listAuditLogs({ limit: 10 });

    expect(result.items).toHaveLength(3);
    expect(result.nextCursor).toBeNull();
  });

  it("最終ページでは nextCursor が null になる", async () => {
    await seedAuditLogs(4);

    const first = await listAuditLogs({ limit: 2 });
    const second = await listAuditLogs({ limit: 2, cursor: first.nextCursor! });

    expect(second.nextCursor).toBeNull();
  });

  it("action フィルタ: USER_LOGIN のみ取得できる", async () => {
    const user = await testPrisma.user.create({
      data: { email: "filter@example.com", name: "フィルタ用", role: "ADMIN" },
      select: { id: true },
    });

    await testPrisma.auditLog.createMany({
      data: [
        { actorId: user.id, action: "USER_LOGIN", diff: "" },
        { actorId: user.id, action: "USER_CREATE", diff: "" },
        { actorId: user.id, action: "USER_LOGIN", diff: "" },
      ],
    });

    const result = await listAuditLogs({ action: "USER_LOGIN" });

    expect(result.items).toHaveLength(2);
    expect(result.items.every((i) => i.action === "USER_LOGIN")).toBe(true);
  });

  it("ログが 0 件のとき空配列と null cursor が返る", async () => {
    const result = await listAuditLogs();

    expect(result.items).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });

  it("デフォルト limit は 50 件まで取得できる", async () => {
    await seedAuditLogs(60);

    const result = await listAuditLogs();

    expect(result.items).toHaveLength(50);
    expect(result.nextCursor).not.toBeNull();
  });
});
