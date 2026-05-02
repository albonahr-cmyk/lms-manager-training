"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Props = {
  /** form の input name (通常 "videoUrl") */
  name: string;
  defaultValue?: string;
  disabled?: boolean;
};

type UploadState =
  | { phase: "idle" }
  | { phase: "uploading"; progress: number }
  | { phase: "done" }
  | { phase: "error"; message: string };

const SAMPLE_URL = "/sample.mp4";

function VideoUrlDescription({ url }: { url: string }) {
  if (url === SAMPLE_URL) {
    return (
      <p className="text-xs text-muted-foreground">
        現在:サンプル動画 (
        <a
          href={SAMPLE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:no-underline"
        >
          /sample.mp4
        </a>
        )
      </p>
    );
  }
  if (url.startsWith("/uploads/")) {
    return (
      <p className="text-xs text-muted-foreground">
        現在:アップロード済み動画 (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:no-underline"
        >
          {url}
        </a>
        )
      </p>
    );
  }
  // Vercel Blob URL 等
  return (
    <p className="text-xs text-muted-foreground">
      現在:{" "}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all underline hover:no-underline"
      >
        {url}
      </a>
    </p>
  );
}

export function VideoUploadField({
  name,
  defaultValue = SAMPLE_URL,
  disabled = false,
}: Props) {
  const [videoUrl, setVideoUrl] = useState(defaultValue);
  const [uploadState, setUploadState] = useState<UploadState>({ phase: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fieldId = useId();

  const isUploading = uploadState.phase === "uploading";
  const isDisabled = disabled || isUploading;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // ブラウザ側の簡易バリデーション
    if (file.type !== "video/mp4") {
      setUploadState({ phase: "error", message: "mp4 ファイルのみアップロードできます。" });
      return;
    }

    void startUpload(file);
  }

  async function startUpload(file: File) {
    setUploadState({ phase: "uploading", progress: 0 });

    // Step 1: URL 発行
    let uploadUrl: string;
    let blobUrl: string;

    try {
      const res = await fetch("/api/admin/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: "video/mp4",
          sizeBytes: file.size,
        }),
      });

      const json = (await res.json()) as
        | { ok: true; data: { uploadUrl: string; blobUrl: string } }
        | { ok: false; error: { code: string; message: string } };

      if (!json.ok) {
        setUploadState({ phase: "error", message: json.error.message });
        return;
      }

      uploadUrl = json.data.uploadUrl;
      blobUrl = json.data.blobUrl;
    } catch {
      setUploadState({ phase: "error", message: "アップロード URL の取得に失敗しました。" });
      return;
    }

    // Step 2: XHR で PUT (upload.onprogress で進捗取得)
    try {
      const finalBlobUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            const pct = Math.round((ev.loaded / ev.total) * 100);
            setUploadState({ phase: "uploading", progress: pct });
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              const body = JSON.parse(xhr.responseText) as
                | { ok: true; data: { blobUrl: string } }
                | { ok: false; error: { code: string; message: string } };
              if (body.ok) {
                resolve(body.data.blobUrl);
              } else {
                reject(new Error(body.error.message));
              }
            } catch {
              reject(new Error("レスポンスの解析に失敗しました。"));
            }
          } else if (xhr.status === 413) {
            reject(new Error("ファイルサイズは 2 GB 以下にしてください。"));
          } else {
            try {
              const body = JSON.parse(xhr.responseText) as {
                ok: false;
                error: { message: string };
              };
              reject(new Error(body.error?.message ?? "アップロードに失敗しました。"));
            } catch {
              reject(new Error(`アップロードに失敗しました (HTTP ${xhr.status})。`));
            }
          }
        };

        xhr.onerror = () => {
          reject(new Error("ネットワークエラーが発生しました。"));
        };

        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", "video/mp4");
        xhr.send(file);
      });

      setVideoUrl(finalBlobUrl);
      setUploadState({ phase: "done" });
      // ファイル input をリセット (同じファイルを再選択できるよう)
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      const message = e instanceof Error ? e.message : "アップロードに失敗しました。";
      setUploadState({ phase: "error", message });
    }

    // blobUrl は URL 発行時点で確定しているが、サーバが PUT 後に最終値を返す。
    // ここでは PUT 200 レスポンスの blobUrl を採用。発行時の blobUrl は補完用に参照のみ。
    void blobUrl; // 未使用変数の lint 抑止
  }

  return (
    <div className="space-y-2">
      {/* hidden input: form submit 時に videoUrl を載せる */}
      <input type="hidden" name={name} value={videoUrl} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${fieldId}-file`}>動画ファイル</Label>
        <div className="flex items-center gap-2 flex-wrap">
          {/* 実際のファイル input は hidden */}
          <input
            ref={fileInputRef}
            id={`${fieldId}-file`}
            type="file"
            accept="video/mp4"
            className="sr-only"
            disabled={isDisabled}
            aria-disabled={isDisabled}
            onChange={handleFileChange}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isDisabled}
            aria-disabled={isDisabled}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadState.phase === "done" ? "再アップロード" : "ファイルを選択"}
          </Button>
          <span className="text-xs text-muted-foreground">.mp4 形式、最大 2 GB</span>
        </div>
      </div>

      {/* 進捗バー */}
      {isUploading && (
        <div
          role="progressbar"
          aria-label="アップロード進捗"
          aria-valuenow={uploadState.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="space-y-1"
        >
          <p className="text-xs text-muted-foreground">
            アップロード中... {uploadState.progress}%
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${uploadState.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 完了メッセージ */}
      {uploadState.phase === "done" && (
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          アップロード完了。保存ボタンを押して反映してください。
        </p>
      )}

      {/* エラーメッセージ */}
      {uploadState.phase === "error" && (
        <p className="text-xs text-destructive" role="alert">
          {uploadState.message}
        </p>
      )}

      {/* 現在の videoUrl 表示 */}
      <VideoUrlDescription url={videoUrl} />

      {/* 手動 URL 入力 (上級者向け折り畳み) */}
      <details className="text-sm">
        <summary className="cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground">
          手動で URL を入力する (上級者向け)
        </summary>
        <div className="mt-1.5 space-y-1">
          <Label htmlFor={`${fieldId}-manual`} className="text-xs">
            動画 URL (/sample.mp4、/uploads/... または Vercel Blob URL)
          </Label>
          <Input
            id={`${fieldId}-manual`}
            type="url"
            className="h-7 text-xs font-mono"
            value={videoUrl}
            disabled={isDisabled}
            aria-disabled={isDisabled}
            onChange={(e) => {
              setVideoUrl(e.target.value);
              // 手動入力時はアップロード状態をリセット
              if (uploadState.phase !== "idle") {
                setUploadState({ phase: "idle" });
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            上のフォームから選択した場合、自動的に更新されます。
          </p>
        </div>
      </details>
    </div>
  );
}
