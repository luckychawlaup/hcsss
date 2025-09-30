
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
import { Loader2, ArrowLeft, Mail, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useRouter } from "next/navigation";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
    setIsLoading(true);
    setError(null);
    setIsSubmitted(false);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (resetError) throw resetError;

      setIsSubmitted(true);
      toast({
        title: "Check Your Email",
        description: `A password reset link has been sent to ${values.email}.`,
      });
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
      <Button variant="ghost" onClick={() => router.push('/login')} className="absolute top-4 left-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Login
      </Button>
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
          <h1 className="text-2xl font-bold text-primary">Forgot Your Password?</h1>
          <p className="text-muted-foreground">
            No worries! Enter your email and we'll send you a reset link.
          </p>
        </div>

        {isSubmitted ? (
          <Alert variant="default" className="bg-primary/10 border-primary/20">
            <CheckCircle className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">Reset Link Sent!</AlertTitle>
            <AlertDescription>
              Please check your inbox (and spam folder) for an email containing a link to reset your password.
            </AlertDescription>
          </Alert>
        ) : (
          <div>
            {error && (
              <Alert variant="destructive" className="my-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your registered email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Mail className="mr-2 h-4 w-4" />
                  Send Reset Link
                </Button>
              </form>
            </Form>
          </div>
        )}
      </div>
    </div>
  );
}
