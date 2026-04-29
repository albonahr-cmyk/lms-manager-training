import { redirect } from "next/navigation";
import { container } from "./container";
import type { SessionUser } from "./ports/auth";

export async function getCurrentUser(): Promise<SessionUser | null> {
  return container.auth.getCurrentUser();
}

export async function requireUser(): Promise<SessionUser> {
  const u = await container.auth.getCurrentUser();
  if (!u || u.deactivated) redirect("/sign-in");
  return u;
}

export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role !== "ADMIN") redirect("/forbidden");
  return u;
}
