
"use client";

import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useTheme } from "../theme/ThemeProvider";

const publicPaths = [
    "/login",
    "/auth/student/login",
    "/auth/teacher/login",
    "/auth/principal/login",
    "/auth/owner/login",
    "/auth/student/forgot-password",
    "/auth/teacher/forgot-password",
    "/auth/update-password",
    "/auth/callback",
];

function Preloader() {
    const { settings } = useTheme();
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
            <div className="flex flex-col items-center justify-center gap-2">
                <Image src={settings.logoUrl || "https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png"} alt="School Logo" width={100} height={100} />
                <h1 className="text-2xl font-bold text-primary mt-2">{settings.schoolName || "H.C.S.S.S."}</h1>
                <p className="text-muted-foreground text-sm">Loading, please wait...</p>
                 <Loader2 className="h-6 w-6 animate-spin text-primary mt-4" />
            </div>
        </div>
    );
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  useEffect(() => {
    if (isPublicPath) {
        setLoading(false);
        return;
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        const authUser = session?.user ?? null;
        
        if (!authUser) {
            router.replace('/login');
        } else {
            setLoading(false);
        }
    });

    return () => {
        authListener.subscription.unsubscribe();
    };
  }, [supabase, pathname, router, isPublicPath]);

  if (isPublicPath) {
      return <>{children}</>;
  }

  if (loading) {
    return <Preloader />;
  }

  return <>{children}</>;
}
