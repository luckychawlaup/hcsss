import TeacherDashboard from "@/components/teacher/TeacherDashboard";
import AuthProvider from "@/components/auth/AuthProvider";


export default async function TeacherPage() {
    return (
        <AuthProvider>
            <TeacherDashboard />
        </AuthProvider>
    );
}
