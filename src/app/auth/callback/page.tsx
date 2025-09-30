
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const supabase = createClient();
  
  useEffect(() => {
    const type = searchParams.get('type');
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/';
    
    // This is for the magic link and other non-recovery flows
    if (code) {
        const exchangeCode = async () => {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error) {
                router.push(next);
            } else {
                 toast({
                    variant: "destructive",
                    title: "Authentication Error",
                    description: error.message || "Failed to process authentication link.",
                });
                router.push('/login');
            }
        };
        exchangeCode();
    } else {
        // This is where password recovery is handled on the client side
        // Supabase automatically handles the session from the URL hash.
        // We just need to listen for the PASSWORD_RECOVERY event.
    }
  }, [searchParams, router, supabase, toast]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // This event is triggered when the user clicks the password recovery link.
        // Supabase has handled the session. We can now redirect to update password.
        router.push('/auth/update-password');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);
  

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Processing your request...</p>
    </div>
  );
}

export default AuthCallbackPage;
