
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getRole } from "@/lib/getRole";
import DashboardPage from "@/components/dashboard/DashboardPage";
import { Skeleton } from "@/components/ui/skeleton";

function LoadingSkeleton() {
    return (
        <div className="flex min-h-screen w-full flex-col bg-background">
             <div className="flex flex-1 flex-col p-4 sm:p-6 lg:p-8 space-y-8">
                <Skeleton className="h-20 w-full" />
                <div className="space-y-6">
                    <Skeleton className="h-16 w-full" />
                    <div className="grid gap-6 md:grid-cols-2">
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        </div>
    );
}


export default function Home() {
  const [role, setRole] = useState<string | null>(null);
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
            const userRole = await getRole(user);
            setRole(userRole);
            if (userRole === 'teacher') {
              router.replace('/teacher');
            } else if (userRole === 'principal') {
              router.replace('/principal');
            } else if (userRole === 'accountant') {
              router.replace('/accountant');
            } else {
              setIsCheckingRole(false);
            }
        } catch (e) {
            console.error("Error getting user role:", e);
            await supabase.auth.signOut();
            router.replace('/login');
        }
      } else {
        router.replace('/login');
      }
    };
    checkUserRole();
  }, [supabase, router]);

  if (isCheckingRole || role !== 'student') {
    return <LoadingSkeleton />;
  }

  return (
      <DashboardPage />
  );
}
