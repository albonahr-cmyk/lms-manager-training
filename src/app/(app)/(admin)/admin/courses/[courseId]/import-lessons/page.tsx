"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Upload, FileText, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importLessonsFromCsv, type ImportLessonsResult } from "./actions";

export default function ImportLessonsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const [courseId, setCourseId] = useState<string>("");
  const [result, setResult] = useState<ImportLessonsResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [fileName, setFileName] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  // params を解決
  params.then((p) => {
    if (!courseId) setCourseId(p.courseId);
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setFileName(file.name);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !courseId) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      startTransition(async () => {
        const res = await importLessonsFromCsv(courseId, text);
        setResult(res);
      });
    };
    reader.readAsText(file, "UTF-8");
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link href={`/admin/courses/${courseId}`}>
            <ArrowLeft className="size-4" />
            コース詳細に戻る
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">レッスンCSVインポート</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          CSVファイルをアップロードしてレッスンを一括登録できます。
          同じコースの既存レッスンは上書きされます。
        </p>
      </div>

      {/* フォーマット説明 */}
      <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
        <p className="text-sm font-medium flex items-center gap-2">
          <FileText className="size-4" />
          CSVフォーマット
        </p>
        <p className="text-xs text-muted-foreground">
          以下の列名をヘッダー行に含めてください（列の順番は問いません）：
        </p>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li><code className="bg-muted px-1 rounded">title</code>（必須）— レッスンタイトル</li>
          <li><code className="bg-muted px-1 rounded">URL</code>（任意）— YouTube URLまたは動画URL</li>
          <li><code className="bg-muted px-1 rounded">in_chapter_no</code> または <code className="bg-muted px-1 rounded">episode_no</code>（任意）— 表示順</li>
        </ul>
        <p className="text-xs text-muted-foreground pt-1">
          ※ スプレッドシートからCSVでダウンロードしたファイルをそのまま使えます。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/20 px-6 py-10 cursor-pointer hover:border-primary/40 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="size-8 text-muted-foreground/50" />
          <div className="text-center">
            <p className="text-sm font-medium">
              {fileName ? fileName : "CSVファイルを選択"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">クリックしてファイルを選択</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <Button
          type="submit"
          disabled={!fileName || isPending}
          className="w-full"
        >
          {isPending ? "インポート中..." : "インポート開始"}
        </Button>
      </form>

      {result && (
        <div
          className={`flex items-start gap-3 rounded-lg border p-4 ${
            result.ok
              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
              : "border-destructive/30 bg-destructive/5"
          }`}
        >
          {result.ok ? (
            <CheckCircle className="size-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />
          )}
          <div className="text-sm">
            {result.ok ? (
              <>
                <p className="font-medium text-emerald-700 dark:text-emerald-400">
                  インポート完了！
                </p>
                <p className="text-emerald-600 dark:text-emerald-500 mt-0.5">
                  {result.imported}件のレッスンを登録しました。
                  {result.skipped > 0 && `（${result.skipped}行スキップ）`}
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-destructive">エラー</p>
                <p className="text-muted-foreground mt-0.5">{result.error}</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
