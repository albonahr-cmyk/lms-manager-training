import type { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  deactivated: boolean;
};

export type SignInInput = { email: string; password: string };
export type SignInResult =
  | { ok: true; user: SessionUser }
  | {
      ok: false;
      code: "INVALID_CREDENTIALS" | "DEACTIVATED" | "RATE_LIMITED";
    };

export interface AuthPort {
  signIn(input: SignInInput): Promise<SignInResult>;
  signOut(): Promise<void>;
  /** 現在の HTTP リクエストから session user を解決。null なら未ログイン */
  getCurrentUser(): Promise<SessionUser | null>;
}
