
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('custom-reset-password', {
        body: {
          mode: 'request',
          email: email
        }
      });

      if (functionError) throw new Error(functionError.message);
      if (data.error) throw new Error(data.error);

      // In a real app, you would not redirect with the token. You'd email it.
      // For this app, we redirect to the update page with the token.
      router.push(`/auth/update-password?token=${data.token}`);
      
    } catch (error: any) {
      setError(error.message || "An unknown error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }
  
  // The success message is no longer needed as we redirect immediately.
  if (isSuccess) {
    return (
        <Alert variant="default" className="bg-primary/10 border-primary/20">
            <CheckCircle className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">Check your email!</AlertTitle>
            <AlertDescription>
                If an account exists, a password reset link has been sent.
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

