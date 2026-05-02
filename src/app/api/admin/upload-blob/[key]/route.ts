import { NextResponse } from "next/server";
import { createWriteStream, unlink } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { container } from "@/server/container";
import { ok, err } from "@/lib/result";

const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
const KEY_PATTERN = /^[\w.\-]+\.mp4$/;
const UPLOADS_DIR = join(process.cwd(), "public", "uploads");

/** 受信前にアップロードディレクトリを保証する */
async function ensureUploadsDir(): Promise<void> {
  await mkdir(UPLOADS_DIR, { recursive: true });
}

/** ファイルを削除する (エラー時クリーンアップ用、失敗しても握り潰す) */
function removeFile(filePath: string): void {
  unlink(filePath, () => {
    // クリーンアップ失敗は無視
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  // 認可ガード
  let actor;
  try {
    const { requireAdmin } = await import("@/server/auth");
    actor = await requireAdmin();
  } catch {
    return NextResponse.json(
      err("UNAUTHENTICATED", "管理者権限が必要です。"),
      { status: 401 },
    );
  }

  const { key } = await params;

  // key の検証 (path traversal 対策)
  if (!KEY_PATTERN.test(key)) {
    return NextResponse.json(
      err("VALIDATION_FAILED", "key が不正です。"),
      { status: 400 },
    );
  }

  // Content-Length による事前サイズチェック
  const contentLengthHeader = req.headers.get("content-length");
  if (contentLengthHeader !== null) {
    const contentLength = parseInt(contentLengthHeader, 10);
    if (!Number.isFinite(contentLength) || contentLength > MAX_BYTES) {
      return NextResponse.json(
        err("FILE_TOO_LARGE", "ファイルサイズは 2 GB 以下にしてください。"),
        { status: 413 },
      );
    }
  }

  // リクエストボディの存在確認
  if (!req.body) {
    return NextResponse.json(
      err("VALIDATION_FAILED", "リクエストボディが空です。"),
      { status: 400 },
    );
  }

  await ensureUploadsDir();

  const filePath = join(UPLOADS_DIR, key);
  const writeStream = createWriteStream(filePath);

  try {
    await new Promise<void>((resolve, reject) => {
      // Web ReadableStream → Node.js Readable に変換
      const nodeReadable = Readable.fromWeb(
        req.body as import("stream/web").ReadableStream<Uint8Array>,
      );

      let bytesWritten = 0;

      nodeReadable.on("data", (chunk: Buffer) => {
        bytesWritten += chunk.length;
        if (bytesWritten > MAX_BYTES) {
          // サイズ超過: ストリームを破棄して書き込みも停止
          nodeReadable.destroy(
            new Error("FILE_TOO_LARGE"),
          );
          writeStream.destroy();
          removeFile(filePath);
          reject(new Error("FILE_TOO_LARGE"));
        }
      });

      nodeReadable.pipe(writeStream);

      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
      nodeReadable.on("error", reject);
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";

    if (message === "FILE_TOO_LARGE") {
      return NextResponse.json(
        err("FILE_TOO_LARGE", "ファイルサイズは 2 GB 以下にしてください。"),
        { status: 413 },
      );
    }

    container.logger.error("admin.upload_blob.failed", {
      key,
      actorId: actor.id,
      message,
    });

    // 書き込みが途中で失敗した場合は部分ファイルを削除
    removeFile(filePath);

    return NextResponse.json(
      err("INTERNAL", "ファイルの保存に失敗しました。"),
      { status: 500 },
    );
  }

  const blobUrl = `/uploads/${key}`;

  container.logger.info("admin.upload_blob.saved", {
    key,
    actorId: actor.id,
    blobUrl,
  });

  return NextResponse.json(ok({ blobUrl }));
}
