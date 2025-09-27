
"use client";

import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useTheme } from "../theme/ThemeProvider";

function Preloader() {
    const { settings } = useTheme();
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
            <div className="relative flex h-32 w-32 items-center justify-center">
                <div className="absolute h-full w-full animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <Image 
                    src={settings.logoUrl || "https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png"} 
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

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        // This event fires on initial load, SIGN_IN, SIGN_OUT, PASSWORD_RECOVERY etc.
        // It provides a consistent way to know when auth state is resolved.
        if (event === 'INITIAL_SESSION') {
             if (!session) {
                router.replace('/login');
            }
            setIsAuthReady(true);
        } else if (event === 'SIGNED_IN') {
             setIsAuthReady(true);
        } else if (event === 'SIGNED_OUT') {
            router.replace('/login');
        }
    });

    return () => {
        authListener.subscription.unsubscribe();
    };
  }, [supabase, router]);


  if (!isAuthReady) {
    return <Preloader />;
  }

  return <>{children}</>;
}
