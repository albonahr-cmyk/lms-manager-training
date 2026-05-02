import { randomUUID } from "node:crypto";
import type { StoragePort, IssueUploadUrlInput } from "@/server/ports/storage";

const MAX_KEY_LENGTH = 200;

/**
 * ファイル名をサニタイズし .mp4 拡張子を強制する。
 * - [^\w.\-] を _ に置換
 * - 拡張子を .mp4 に強制
 * - 全体を MAX_KEY_LENGTH 文字に切り詰め
 */
function sanitizeFilename(filename: string): string {
  // 拡張子を除いたベース名を取り出す
  const dotIndex = filename.lastIndexOf(".");
  const base = dotIndex >= 0 ? filename.slice(0, dotIndex) : filename;
  const safe = base.replace(/[^\w.\-]/g, "_");
  const withExt = `${safe}.mp4`;
  return withExt.slice(0, MAX_KEY_LENGTH);
}

export const stubStorage: StoragePort = {
  async issueUploadUrl(input: IssueUploadUrlInput) {
    const safeFilename = sanitizeFilename(input.filename);
    const key = `${randomUUID()}-${safeFilename}`;
    return {
      uploadUrl: `/api/admin/upload-blob/${key}`,
      blobUrl: `/uploads/${key}`,
    };
  },
  async resolveVideoUrl(key: string) {
    return `/uploads/${key}`;
  },
};
