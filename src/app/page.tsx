
"use client";

import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getRole } from "@/lib/getRole";
import DashboardPage from "@/components/dashboard/DashboardPage";
import Image from "next/image";
import Loading from "./loading";

function Preloader() {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
            <div className="relative flex h-32 w-32 items-center justify-center">
                <div className="absolute h-full w-full animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <Image 
                    src="/hcsss.png"
                    alt="School Logo" 
                    width={100} 
                    height={100} 
                    className="rounded-full"
                    priority
                />
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
      // Do not run this check if we are in the middle of a password reset.
      // Supabase adds #access_token=... to the URL for password recovery.
      if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
          setIsCheckingRole(false); 
          // Let the dedicated callback/update-password pages handle it.
          // We might even want to redirect to the callback page if we land here.
          // For now, just stopping the redirect logic is enough.
          return;
      }
      
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
            } else if (userRole === 'owner') {
              router.replace('/owner');
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
    return <Preloader />;
  }

  return (
      <Suspense fallback={<Loading />}>
        <DashboardPage />
      </Suspense>
  );
}
