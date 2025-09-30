"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  
  useEffect(() => {
    const supabase = createClient();
    
    const handleAuth = async () => {
      // Supabase's library automatically handles the session from the URL hash.
      // We just need to listen for the PASSWORD_RECOVERY event.
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          // This event fires when the user clicks the password reset link.
          // Supabase has now created a temporary secure session.
          // We can safely redirect to the update password page.
          router.replace('/auth/update-password');
        } else {
          // For any other auth event (like magic link login), go home.
          router.replace('/');
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    };

    handleAuth();

  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Finalizing your secure session...</p>
      </div>
    </div>
  );
}
