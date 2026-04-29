import type { MailPort } from "@/server/ports/mail";
import { stubLogger } from "./logger";

export const stubMail: MailPort = {
  async send(to, subject, body) {
    stubLogger.info("[mail.stub] send", { to, subject, body });
  },
};
