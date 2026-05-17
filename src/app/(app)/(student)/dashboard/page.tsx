import { StudentTrainingDashboard } from "@/components/feature/dashboard/StudentTrainingDashboard";
import { requireUser } from "@/server/auth";

export const metadata = { title: "ダッシュボード | LMS" };

export default async function DashboardPage() {
  const user = await requireUser();

  return <StudentTrainingDashboard userName={user.name} />;
}
