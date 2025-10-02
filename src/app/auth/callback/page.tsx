
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  
  useEffect(() => {
    const supabase = createClient();
    
    // This page should ONLY handle the password recovery flow.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // The `PASSWORD_RECOVERY` event is fired when the user clicks the link
      // in the password reset email.
      if (event === 'PASSWORD_RECOVERY') {
          // Supabase's client library automatically handles the session from the URL hash.
          // We can now safely redirect to the page where the user can set a new password.
          router.replace('/auth/update-password');
      }
    });

    // Cleanup the subscription when the component unmounts
    return () => {
      subscription.unsubscribe();
    };
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
