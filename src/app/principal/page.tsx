import PrincipalDashboard from "@/components/principal/PrincipalDashboard";
import AuthProvider from "@/components/auth/AuthProvider";


export default async function PrincipalPage() {
    return (
        <AuthProvider>
            <PrincipalDashboard />
        </AuthProvider>
    );
}
