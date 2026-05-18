import { requireAdmin } from "@/server/auth";
import { ImportLessonsClient } from "./ImportLessonsClient";

export const metadata = { title: "CSVインポート | albona University" };

export default async function ImportLessonsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  await requireAdmin();
  const { courseId } = await params;
  return <ImportLessonsClient courseId={courseId} />;
}
