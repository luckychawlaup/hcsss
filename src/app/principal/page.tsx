import PrincipalDashboard from "@/components/principal/PrincipalDashboard";
import { redirect } from "next/navigation";
import { headers } from "next/headers";


const checkAuth = async () => {
  const h = headers();
  const userCookie = h.get("cookie")?.includes("firebase-user");
  // This is a very basic check and not secure for production.
  // It's just to demonstrate the flow.
  if (!userCookie) {
    redirect("/login");
  }
};


export default async function PrincipalPage() {
    await checkAuth();
    return <PrincipalDashboard />;
}
