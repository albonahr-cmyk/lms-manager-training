/**
 * 監査ログ取得サービス
 *
 * カーソルは id ベース (at desc, id desc 降順)。
 * actor (User) を include で一括取得して N+1 を回避する。
 */

import type { AuditAction } from "@prisma/client";
import { prisma } from "@/server/repositories/db";

export type AuditLogItem = {
  id: string;
  action: AuditAction;
  target: string | null;
  diff: string; // JSON 文字列のまま返す (UI 側で必要に応じて parse)
  at: Date;
  actor: {
    id: string;
    email: string;
    name: string;
  } | null;
};

export type ListAuditLogsInput = {
  cursor?: string; // AuditLog.id — このレコードより古いものを返す
  action?: AuditAction;
  limit?: number;
};

export type ListAuditLogsResult = {
  items: AuditLogItem[];
  nextCursor: string | null; // 次ページの先頭 id。null なら最終ページ
};

export async function listAuditLogs(
  input: ListAuditLogsInput = {},
): Promise<ListAuditLogsResult> {
  const limit = Math.min(input.limit ?? 50, 200);

  // cursor が指定されている場合、そのレコードの at を取得して filter に使う
  let cursorRecord: { at: Date; id: string } | null = null;
  if (input.cursor) {
    cursorRecord = await prisma.auditLog.findUnique({
      where: { id: input.cursor },
      select: { at: true, id: true },
    });
  }

  const items = await prisma.auditLog.findMany({
    where: {
      ...(input.action ? { action: input.action } : {}),
      // カーソルより古いレコード: at が cursor の at より小さい、
      // または at が同じで id が cursor より小さい (辞書順)
      ...(cursorRecord
        ? {
            OR: [
              { at: { lt: cursorRecord.at } },
              { at: cursorRecord.at, id: { lt: cursorRecord.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ at: "desc" }, { id: "desc" }],
    take: limit + 1, // 次ページ有無を判定するために 1 件余分に取得
    select: {
      id: true,
      action: true,
      target: true,
      diff: true,
      at: true,
      actor: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  const hasNext = items.length > limit;
  const page = hasNext ? items.slice(0, limit) : items;
  const nextCursor = hasNext ? (page[page.length - 1]?.id ?? null) : null;

  return { items: page, nextCursor };
}
