
import DashboardPage from "@/components/dashboard/DashboardPage";
import { getAuth } from "firebase/auth";
import { app } from "@/lib/firebase";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import AuthProvider from "@/components/auth/AuthProvider";

const checkAuth = async () => {
  const h = headers();
  const cookie = h.get("cookie");
  const userCookie = cookie?.includes("firebase-user");
  const isPrincipal = cookie?.includes("principal-role"); // A bit of a hack for this case

  // Don't protect principal route here
  if (h.get('next-url') === '/principal' && isPrincipal) {
    return;
  }
  
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
