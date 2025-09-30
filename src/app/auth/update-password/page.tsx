"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from "next/image";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

function UpdatePasswordContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 5;
    
    const checkSession = async () => {
      console.log('🔍 Checking for password reset session... Attempt:', attempts + 1);
      
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('Session check result:', {
          hasSession: !!session,
          userId: session?.user?.id,
          error: sessionError?.message
        });

        if (session) {
          console.log('✅ Valid session found!');
          setIsReady(true);
          setCheckingSession(false);
          return;
        }

        // Retry if no session yet (it might be loading)
        attempts++;
        if (attempts < maxAttempts) {
          console.log('⏳ No session yet, retrying in 500ms...');
          setTimeout(checkSession, 500);
        } else {
          console.error('❌ No session after', maxAttempts, 'attempts');
          setError("No active password reset session. The link may have expired or been used. Please request a new one.");
          setCheckingSession(false);
        }
      } catch (e) {
        console.error('❌ Error checking session:', e);
        setError("Error verifying session. Please try again.");
        setCheckingSession(false);
      }
    };

    checkSession();

    // Also listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔔 Auth state changed:', event, 'Has session:', !!session);
      
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        console.log('✅ Password recovery session detected via auth listener');
        setIsReady(true);
        setCheckingSession(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!isReady) {
      setError("Cannot reset password without a valid session.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔐 Attempting to update password...');
      const { error: updateError } = await supabase.auth.updateUser({ password: password });
      
      if (updateError) {
        console.error('❌ Password update error:', updateError);
        throw updateError;
      }
      
      console.log('✅ Password updated successfully!');
      setIsSuccess(true);
      toast({
        title: "Password Set Successfully",
        description: "Your password has been changed. You can now log in.",
      });
      
      // Log the user out after a successful password change
      console.log('🚪 Signing out user...');
      await supabase.auth.signOut();
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
      
    } catch(e: any) {
      console.error('❌ Error during password update:', e);
      setError(e.message || "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <Image src={"/hcsss.png"} alt="School Logo" width={80} height={80} className="mb-4 rounded-full mx-auto" priority />
          <div className="space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Verifying your password reset session...</p>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (isSuccess) {
      return (
        <Alert variant="default" className="bg-primary/10 border-primary/20">
          <CheckCircle className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary">Password Updated!</AlertTitle>
          <AlertDescription className="space-y-4">
            Your password has been set successfully. Redirecting to login...
            <div className="pt-2">
              <Button asChild>
                <Link href="/login">Go to Login Now</Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }
    
    return (
      <>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error}
                {error.includes("expired") && (
                  <div className="pt-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href="/auth/forgot-password">Request New Reset Link</Link>
                    </Button>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input 
              id="password" 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              disabled={!isReady}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input 
              id="confirmPassword" 
              type="password" 
              placeholder="••••••••" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              disabled={!isReady}
              required
              minLength={8}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading || !isReady}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Set New Password
          </Button>
        </form>
      </>
    );
  };
  
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Image src={"/hcsss.png"} alt="School Logo" width={80} height={80} className="mb-4 rounded-full mx-auto" priority />
          <h1 className="text-2xl font-bold text-primary">Set Your Password</h1>
          <p className="text-muted-foreground">
            {isReady ? "Please enter and confirm your new password below to secure your account." : "Preparing password reset..."}
          </p>
        </div>
        
        <div>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    }>
      <UpdatePasswordContent />
    </Suspense>
  );
}