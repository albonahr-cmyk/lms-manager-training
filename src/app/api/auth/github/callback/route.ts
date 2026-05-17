import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/repositories/db";
import { setSessionCookie } from "@/server/adapters/stub/session";

export const runtime = "nodejs";

type GitHubTokenResponse = {
  access_token?: string;
  error?: string;
};

type GitHubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};

function signInErrorRedirect(origin: string, code: string): Response {
  return NextResponse.redirect(
    new URL(`/sign-in?error=${code}`, origin),
  );
}

async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
): Promise<string | null> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as GitHubTokenResponse;
  return data.access_token ?? null;
}

async function getPrimaryVerifiedEmail(
  accessToken: string,
): Promise<string | null> {
  const res = await fetch("https://api.github.com/user/emails", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) return null;
  const emails = (await res.json()) as GitHubEmail[];
  const primary = emails.find((e) => e.primary && e.verified);
  return primary?.email ?? null;
}

export async function GET(req: NextRequest): Promise<Response> {
  const origin = req.nextUrl.origin;
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const storedState = req.cookies.get("github_oauth_state")?.value;

  // CSRF 検証
  if (!state || !storedState || state !== storedState) {
    return signInErrorRedirect(origin, "oauth_state");
  }
  if (!code) {
    return signInErrorRedirect(origin, "oauth_code");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin;
  const redirectUri = `${appUrl}/api/auth/github/callback`;

  const accessToken = await exchangeCodeForToken(code, redirectUri);
  if (!accessToken) {
    return signInErrorRedirect(origin, "oauth_token");
  }

  const email = await getPrimaryVerifiedEmail(accessToken);
  if (!email) {
    return signInErrorRedirect(origin, "oauth_email");
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, role: true, deactivated: true, sessionVersion: true },
  });

  if (!user || user.deactivated) {
    return signInErrorRedirect(origin, "user_not_found");
  }

  await setSessionCookie({
    userId: user.id,
    role: user.role,
    sessionVersion: user.sessionVersion,
  });

  const res = NextResponse.redirect(new URL("/dashboard", origin));
  res.cookies.delete("github_oauth_state");
  return res;
}
