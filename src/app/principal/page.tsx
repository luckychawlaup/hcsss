
'use client';

import PrincipalDashboard from "@/components/principal/PrincipalDashboard";
import AuthProvider from "@/components/auth/AuthProvider";

export default function PrincipalPage() {
    return (
        <AuthProvider>
            <PrincipalDashboard />
        </AuthProvider>
    );
}
