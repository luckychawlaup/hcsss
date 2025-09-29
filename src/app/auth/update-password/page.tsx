
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
import { useRouter, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";


function UpdatePasswordContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { toast } = useToast();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError("No password reset token found in the URL. Please request a new link.");
    }
  }, [token]);


  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) {
        setError("Invalid or missing reset token.");
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
        const { data, error: functionError } = await supabase.functions.invoke('custom-reset-password', {
            body: {
                mode: 'reset',
                token: token,
                new_password: password
            }
        });

        if (functionError) throw new Error(functionError.message);
        if (data.error) throw new Error(data.error);

        setIsSuccess(true);
        toast({
            title: "Password Set Successfully",
            description: "Your password has been changed successfully. You can now log in.",
        });

    } catch (e: any) {
        setError(e.message || "Your password reset link may be invalid or has expired. Please request a new one.");
    } finally {
        setIsLoading(false);
    }
  }

  const renderContent = () => {
    if (isSuccess) {
      return (
        <Alert variant="default" className="bg-primary/10 border-primary/20">
          <CheckCircle className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary">Password Updated!</AlertTitle>
          <AlertDescription className="space-y-4">
            Your password has been set successfully.
            <div className="pt-2">
              <Button asChild>
                <Link href="/login">Proceed to Login</Link>
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
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
               <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} disabled={!token}/>
               </div>
               <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={!token}/>
               </div>
              <Button type="submit" className="w-full" disabled={isLoading || !token}>
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
              Please enter and confirm your new password below to secure your account.
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
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <UpdatePasswordContent />
        </Suspense>
    )
}
