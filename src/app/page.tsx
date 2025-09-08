
import DashboardPage from "@/components/dashboard/DashboardPage";
import { getAuth } from "firebase/auth";
import { app } from "@/lib/firebase";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import AuthProvider from "@/components/auth/AuthProvider";

const checkAuth = async () => {
  const h = headers();
  const cookie = h.get("cookie");
  // A very basic check. In a real app, you'd want something more robust.
  const hasUser = cookie?.includes("firebase-user");
  
  if (!hasUser) {
    redirect("/login");
  }
};

export default async function Home() {
  await checkAuth();

  return (
    <AuthProvider>
      <DashboardPage />
    </AuthProvider>
  );
}
