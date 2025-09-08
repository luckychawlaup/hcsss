import PrincipalDashboard from "@/components/principal/PrincipalDashboard";
import { redirect } from "next/navigation";
import { headers } from "next/headers";


const checkAuth = async () => {
  const h = headers();
  const cookie = h.get("cookie");
  const userCookie = cookie?.includes("firebase-user=true");
  const isPrincipal = cookie?.includes("principal-role=true");
  
  // This is a basic check. In a real app, you'd want something more robust
  // like checking a token against your backend.
  if (!userCookie || !isPrincipal) {
    redirect("/login");
  }
};


export default async function PrincipalPage() {
    await checkAuth();
    return <PrincipalDashboard />;
}
