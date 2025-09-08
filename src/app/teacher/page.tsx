import TeacherDashboard from "@/components/teacher/TeacherDashboard";
import { redirect } from "next/navigation";
import { headers } from "next/headers";


const checkAuth = async () => {
  const h = headers();
  const cookie = h.get("cookie");
  const userCookie = cookie?.includes("firebase-user=true");
  const isTeacher = cookie?.includes("teacher-role=true");
  
  // This is a basic check. In a real app, you'd want something more robust
  // like checking a token against your backend.
  if (!userCookie || !isTeacher) {
    redirect("/login");
  }
};


export default async function TeacherPage() {
    await checkAuth();
    return <TeacherDashboard />;
}
