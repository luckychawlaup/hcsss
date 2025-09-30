
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from "next/image";

const updatePasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters long."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export default function UpdatePasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;
    
    const handlePasswordRecovery = async () => {
      console.log('Starting password recovery check...');
      console.log('Current URL:', window.location.href);
      console.log('Hash fragment:', window.location.hash);
      
      // Check if we have token_hash in the URL hash
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const token_hash = hashParams.get('token_hash');
        const type = hashParams.get('type');
        
        console.log('Hash params:', { token_hash: !!token_hash, type });
        
        if (token_hash && type === 'recovery') {
          console.log('Found recovery token in hash, verifying...');
          
          try {
            const { data, error: verifyError } = await supabase.auth.verifyOtp({
              token_hash,
              type: 'recovery',
            });
            
            if (verifyError) {
              console.error('Verify OTP error:', verifyError);
              if (mounted) {
                setError(verifyError.message || "Invalid or expired recovery link. Please request a new one.");
                setIsReady(false);
              }
              return;
            }
            
            console.log('Recovery token verified successfully, session:', !!data.session);
            
            if (mounted) {
              setIsReady(true);
              setError(null);
              // Clear the hash from URL for security
              window.history.replaceState(null, '', window.location.pathname);
            }
            return;
          } catch (err: any) {
            console.error('Error verifying recovery token:', err);
            if (mounted) {
              setError(err.message || "Failed to verify recovery token. Please request a new link.");
              setIsReady(false);
            }
            return;
          }
        }
      }
      
      // No hash params, check if there's already a session
      console.log('No hash params, checking existing session...');
      const { data: { session } } = await supabase.auth.getSession();
      
      console.log('Initial session check:', !!session);
      
      if (session && mounted) {
        console.log('Session found immediately');
        setIsReady(true);
        setError(null);
      } else if (mounted) {
        console.log('No session found, will wait for auth state change...');
        // Don't show error immediately, wait for auth state listener
      }
    };

    handlePasswordRecovery();
    
    // Listen for auth state changes - this is triggered when Supabase processes the hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, 'has session:', !!session);
      
      if (!mounted) return;
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log('PASSWORD_RECOVERY event detected');
        setIsReady(true);
        setError(null);
      } else if (event === 'SIGNED_IN' && session) {
        console.log('SIGNED_IN event with session');
        setIsReady(true);
        setError(null);
      } else if (event === 'USER_UPDATED') {
        console.log('USER_UPDATED event');
      }
      
      // After waiting a bit, if still no session, show error
      if (!session && event !== 'PASSWORD_RECOVERY') {
        setTimeout(async () => {
          if (mounted) {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession && mounted) {
              setError("No active password reset session. Please request a new password reset link if you haven't already.");
              setIsReady(false);
            }
          }
        }, 1000);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const form = useForm<z.infer<typeof updatePasswordSchema>>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: z.infer<typeof updatePasswordSchema>) {
    setIsLoading(true);
    setError(null);

    // Re-check session right before submission for security.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        setError("Your password reset session has expired. Please request a new link.");
        setIsLoading(false);
        return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (updateError) throw updateError;
      
      toast({
        title: "Password Updated Successfully!",
        description: "Please log in with your new password.",
      });

      // Log out from the temporary session for security
      await supabase.auth.signOut();
      router.push("/login");

    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Image
            src={"/hcsss.png"}
            alt="School Logo"
            width={80}
            height={80}
            className="mx-auto mb-4 rounded-full"
            priority
          />
          <h1 className="text-2xl font-bold text-primary">Set Your New Password</h1>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} disabled={!isReady || isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} disabled={!isReady || isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={!isReady || isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <KeyRound className="mr-2 h-4 w-4" />
              Set New Password
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
