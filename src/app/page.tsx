
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getRole } from "@/lib/getRole";
import DashboardPage from "@/components/dashboard/DashboardPage";
import { Loader2 } from "lucide-react";
import Image from "next/image";

function Preloader() {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
            <div className="relative flex h-32 w-32 items-center justify-center">
                <div className="absolute h-full w-full animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <Image 
                    src="https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png"
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
  const [loading, setLoading] = useState(true);
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
            } else if (userRole === 'principal' || userRole === 'owner') {
              router.replace('/principal');
            } else {
              setLoading(false);
            }
        } catch (e) {
            console.error("Error getting user role:", e);
            // Handle error, maybe redirect to login
            await supabase.auth.signOut();
            router.replace('/login');
        }
      } else {
        router.replace('/login');
      }
    };
    checkUserRole();
  }, [supabase, router]);

  if (loading || role !== 'student') {
    return <Preloader />;
  }

  return (
      <DashboardPage />
  );
}
