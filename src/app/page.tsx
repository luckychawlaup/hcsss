
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getRole } from "@/lib/getRole";
import DashboardPage from "@/components/dashboard/DashboardPage";
import AuthProvider from "@/components/auth/AuthProvider";
import TodayHomework from "@/components/dashboard/TodayHomework";
import FeePayment from "@/components/dashboard/FeePayment";

export default function Home() {
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
        if (userRole === 'teacher') {
          router.replace('/teacher');
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

  if (loading || role !== 'student') {
    return null; // Or a preloader
  }

  return (
    <AuthProvider>
      <DashboardPage>
         <div className="mx-auto w-full max-w-4xl space-y-6">
            <FeePayment />
            <TodayHomework />
        </div>
      </DashboardPage>
    </AuthProvider>
  );
}
