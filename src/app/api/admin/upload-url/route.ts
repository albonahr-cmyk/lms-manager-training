import { NextResponse } from "next/server";
import { z } from "zod";
import { container } from "@/server/container";
import { ok, err } from "@/lib/result";

const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
const ALLOWED_TYPES = new Set(["video/mp4"]);

const BodySchema = z.object({
  filename: z.string().min(1).max(256),
  contentType: z.string().min(1).max(100),
  sizeBytes: z.number().int().min(0).max(MAX_BYTES),
});

export async function POST(req: Request) {
  let user;
  try {
    const { requireAdmin } = await import("@/server/auth");
    user = await requireAdmin();
  } catch {
    return NextResponse.json(
      err("UNAUTHENTICATED", "管理者権限が必要です。"),
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      err("VALIDATION_FAILED", "JSON ボディを解析できません。"),
      { status: 400 },
    );
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      err("VALIDATION_FAILED", "入力値が不正です。"),
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.has(parsed.data.contentType)) {
    return NextResponse.json(
      err("VALIDATION_FAILED", "mp4 (video/mp4) のみアップロード可能です。"),
      { status: 422 },
    );
  }

  // モックは /sample.mp4 を返す。本番は Vercel Blob 署名 URL に切り替える。
  const result = await container.storage.issueUploadUrl(parsed.data);
  container.logger.info("admin.upload_url.issued", {
    userId: user.id,
    filename: parsed.data.filename,
    sizeBytes: parsed.data.sizeBytes,
  });
  return NextResponse.json(ok(result));
}
