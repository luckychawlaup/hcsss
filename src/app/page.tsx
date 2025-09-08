import DashboardPage from "@/components/dashboard/DashboardPage";
import { getAuth } from "firebase/auth";
import { app } from "@/lib/firebase";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import AuthProvider from "@/components/auth/AuthProvider";

// This is a temporary solution to check auth state on the server.
// In a real app, you'd use a more robust solution like middleware
// or a dedicated library to handle server-side authentication.
const checkAuth = async () => {
  const h = headers();
  const userCookie = h.get("cookie")?.includes("firebase-user");
  // This is a very basic check and not secure for production.
  // It's just to demonstrate the flow.
  if (!userCookie) {
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