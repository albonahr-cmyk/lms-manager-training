"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { container } from "@/server/container";

const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type SignInActionState = {
  error?: string;
  values?: { email?: string };
};

export async function signInAction(
  _prev: SignInActionState | undefined,
  formData: FormData,
): Promise<SignInActionState> {
  const raw = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };

  const parsed = SignInSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: "メールアドレスまたはパスワードが正しくありません。",
      values: { email: raw.email },
    };
  }

  const result = await container.auth.signIn(parsed.data);
  if (!result.ok) {
    const msg =
      result.code === "DEACTIVATED"
        ? "アカウントが無効化されています。管理者に連絡してください。"
        : "メールアドレスまたはパスワードが正しくありません。";
    return { error: msg, values: { email: raw.email } };
  }

  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  await container.auth.signOut();
  redirect("/sign-in");
}
