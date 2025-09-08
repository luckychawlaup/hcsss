
import DashboardPage from "@/components/dashboard/DashboardPage";
import AuthProvider from "@/components/auth/AuthProvider";

export default async function Home() {
  return (
    <AuthProvider>
      <DashboardPage />
    </AuthProvider>
  );
}
