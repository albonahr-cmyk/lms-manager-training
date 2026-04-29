import type { AuditPort } from "@/server/ports/audit";
import { prisma } from "@/server/repositories/db";

export const stubAudit: AuditPort = {
  async write({ actorId, action, target, diff }) {
    await prisma.auditLog.create({
      data: {
        actorId: actorId ?? null,
        action,
        target: target ?? null,
        diff: diff === undefined ? "" : JSON.stringify(diff),
      },
    });
  },
};
