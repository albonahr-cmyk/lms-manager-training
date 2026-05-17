"use client";

import Link from "next/link";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CourseProgressSummary } from "@/lib/dashboard-mock";

type Props = {
  progress: CourseProgressSummary;
};

export function CourseProgressSection({ progress }: Props) {
  const remaining = 100 - progress.completionRate;
  const chartData = [
    { name: "完了", value: progress.completionRate, fill: "#3B4FD4" },
    { name: "未完了", value: remaining, fill: "oklch(0.93 0.01 195)" },
  ];

  const deadlineLabel = new Date(progress.deadline).toLocaleDateString(
    "ja-JP",
    { year: "numeric", month: "long", day: "numeric" },
  );

  return (
    <section aria-labelledby="course-progress-heading">
      <Card className="overflow-hidden border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle
            id="course-progress-heading"
            className="text-lg font-semibold"
          >
            コース進捗
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-8 md:grid-cols-[minmax(0,240px)_1fr] md:items-center">
          <div
            className="relative mx-auto aspect-square w-full max-w-[220px]"
            role="img"
            aria-label={`完了率 ${progress.completionRate}パーセント`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="62%"
                  outerRadius="88%"
                  startAngle={90}
                  endAngle={-270}
                  strokeWidth={0}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value}%`, name]}
                  contentStyle={{
                    borderRadius: "0.5rem",
                    border: "1px solid oklch(0.92 0.012 195)",
                    fontSize: "0.875rem",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold tabular-nums text-brand-start">
                {progress.completionRate}%
              </span>
              <span className="text-xs text-muted-foreground">完了率</span>
            </div>
          </div>

          <div className="space-y-6">
            <dl className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border bg-muted/30 px-4 py-3">
                <dt className="text-xs text-muted-foreground">完了カテゴリ</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">
                  {progress.completedCategories}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    / {progress.totalCategories}
                  </span>
                </dd>
              </div>
              <div className="rounded-lg border bg-muted/30 px-4 py-3">
                <dt className="text-xs text-muted-foreground">完了ブロック</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">
                  {progress.completedBlocks}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    / {progress.totalBlocks}
                  </span>
                </dd>
              </div>
              <div className="rounded-lg border bg-muted/30 px-4 py-3">
                <dt className="text-xs text-muted-foreground">学習期限</dt>
                <dd className="mt-1 text-sm font-semibold">{deadlineLabel}</dd>
              </div>
            </dl>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild variant="gradient" size="lg" className="min-w-[200px]">
                <Link href={`/courses/${progress.continueCourseId}`}>
                  つづきから学習する
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="min-w-[200px] border bg-white shadow-xs hover:bg-muted/40"
              >
                <Link href={`/courses/${progress.continueCourseId}`}>
                  進捗の詳細を確認
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
