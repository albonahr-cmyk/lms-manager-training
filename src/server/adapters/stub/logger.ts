import type { LogMeta, LoggerPort } from "@/server/ports/logger";

/* eslint-disable no-console */
export const stubLogger: LoggerPort = {
  info(msg, meta) {
    if (meta) console.info(`[info] ${msg}`, meta);
    else console.info(`[info] ${msg}`);
  },
  warn(msg, meta) {
    if (meta) console.warn(`[warn] ${msg}`, meta);
    else console.warn(`[warn] ${msg}`);
  },
  error(msg, meta) {
    if (meta) console.error(`[error] ${msg}`, meta);
    else console.error(`[error] ${msg}`);
  },
};

export type { LogMeta };
