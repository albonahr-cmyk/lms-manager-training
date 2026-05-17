"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CATEGORY_STATUS_LABEL,
  type CategoryProgressStatus,
  type CategoryRow,
} from "@/lib/dashboard-mock";
import { cn } from "@/lib/utils";

type Props = {
  categories: CategoryRow[];
};

const STATUS_BADGE_CLASS: Record<CategoryProgressStatus, string> = {
  not_started:
    "border-transparent bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  in_progress:
    "border-transparent bg-brand-start/15 text-brand-start",
  completed:
    "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

export function CategoryTable({ categories }: Props) {
  return (
    <section aria-labelledby="category-table-heading">
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle
            id="category-table-heading"
            className="text-lg font-semibold"
          >
            カテゴリー一覧
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0 sm:px-6 sm:pb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14 pl-6">番号</TableHead>
                <TableHead>カテゴリ名</TableHead>
                <TableHead>完了予定日</TableHead>
                <TableHead className="pr-6 text-right">進捗状況</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="pl-6 font-medium tabular-nums text-muted-foreground">
                    {row.id}
                  </TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(row.dueDate).toLocaleDateString("ja-JP")}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <Badge
                      className={cn(
                        "font-medium",
                        STATUS_BADGE_CLASS[row.status],
                      )}
                    >
                      {CATEGORY_STATUS_LABEL[row.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
