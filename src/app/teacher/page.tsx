
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getRole } from "@/lib/getRole";
import TeacherDashboard from "@/components/teacher/TeacherDashboard";
import AuthProvider from "@/components/auth/AuthProvider";

export default function TeacherPage() {
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const checkUserRole = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const userRole = await getRole(user);
                setRole(userRole);
                if (userRole === 'student') {
                    router.replace('/');
                } else if (userRole === 'principal' || userRole === 'owner') {
                    router.replace('/principal');
                } else {
                    setLoading(false);
                }
            } else {
                router.replace('/login');
            }
        };
        checkUserRole();
    }, [supabase, router]);

    if (loading || role !== 'teacher') {
        return null; // Or a preloader
    }
    
    return (
        <AuthProvider>
            <TeacherDashboard />
        </AuthProvider>
    );
}
