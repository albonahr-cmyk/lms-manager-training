import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  redirect("/sign-in");
}
