export interface MailPort {
  send(to: string, subject: string, body: string): Promise<void>;
}
