import type { AuditAction } from "@prisma/client";

export type AuditWriteInput = {
  actorId?: string | null;
  action: AuditAction;
  target?: string | null;
  diff?: unknown;
};

export interface AuditPort {
  write(input: AuditWriteInput): Promise<void>;
}
