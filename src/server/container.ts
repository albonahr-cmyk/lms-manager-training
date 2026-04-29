import type { AuthPort } from "./ports/auth";
import type { AuditPort } from "./ports/audit";
import type { LoggerPort } from "./ports/logger";
import type { MailPort } from "./ports/mail";
import type { StoragePort } from "./ports/storage";

import { stubAuth } from "./adapters/stub/auth";
import { stubAudit } from "./adapters/stub/audit";
import { stubLogger } from "./adapters/stub/logger";
import { stubMail } from "./adapters/stub/mail";
import { stubStorage } from "./adapters/stub/storage";

const mode = process.env.APP_MODE ?? "stub";

export type Container = {
  auth: AuthPort;
  audit: AuditPort;
  logger: LoggerPort;
  mail: MailPort;
  storage: StoragePort;
};

// 現状 prod adapter は未実装。mode === "prod" は将来差し替える。
export const container: Container =
  mode === "prod"
    ? {
        auth: stubAuth,
        audit: stubAudit,
        logger: stubLogger,
        mail: stubMail,
        storage: stubStorage,
      }
    : {
        auth: stubAuth,
        audit: stubAudit,
        logger: stubLogger,
        mail: stubMail,
        storage: stubStorage,
      };
