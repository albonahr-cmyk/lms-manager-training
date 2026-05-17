import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET(req: Request): Response {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "CONFIG_ERROR", message: "GitHub OAuth is not configured" },
      },
      { status: 503 },
    );
  }

  const state = crypto.randomUUID();
  const origin = new URL(req.url).origin;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin;
  const redirectUri = `${appUrl}/api/auth/github/callback`;

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "user:email");
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url.toString());
  res.cookies.set("github_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  return res;
}
