
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";

interface ForgotPasswordFormProps {
    role: "student" | "teacher" | "principal" | "accountant" | "owner";
}

export default function ForgotPasswordForm({ role }: ForgotPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const { toast } = useToast();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (resetError) {
        throw resetError;
      }
      
      setIsSuccess(true);
    } catch (error: any) {
      let errorMessage = "An unknown error occurred. Please try again later.";
      // Check for Supabase rate-limiting error
      if (error.message && error.message.includes("For security purposes, you can only request this once every")) {
        errorMessage = "A password reset email has already been sent recently. Please check your inbox or wait a minute before trying again.";
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }
  
  if (isSuccess) {
    return (
        <Alert variant="default" className="bg-primary/10 border-primary/20">
            <CheckCircle className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">Check your email!</AlertTitle>
            <AlertDescription>
                If an account exists for the email you provided, a password reset link has been sent. Please follow the instructions in the email.
            </AlertDescription>
        </Alert>
    )
  }

  return (
    <>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Registered Email Address</Label>
            <Input
                type="email"
                placeholder={`${role}@example.com`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Reset Link
          </Button>
        </form>
    </>
  );
}
