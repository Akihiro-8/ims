import { redirect } from "next/navigation";
import AuthHome from "@/app/components/auth-home";
import { getCurrentUser, getDashboardPath } from "@/utils/auth";

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    redirect(getDashboardPath(user.role));
  }

  return <AuthHome />;
}
