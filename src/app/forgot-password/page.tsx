
"use client";

import { useState } from "react";
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
import { Loader2, KeyRound, AlertCircle, CheckCircle, Mail, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
    setIsLoading(true);
    setError(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      values.email,
      {
        redirectTo: 'https://9000-firebase-studio-1757343757356.cluster-52r6vzs3ujeoctkkxpjif3x34a.cloudworkstations.dev/auth/callback',
      }
    );

    setIsLoading(false);
    
    if (resetError) {
      setError(resetError.message);
    } else {
      setIsSubmitted(true);
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
      <Link href="/login" passHref>
         <Button variant="ghost" className="absolute top-4 left-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
        </Button>
      </Link>
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
          <h1 className="text-2xl font-bold text-primary">Forgot Password</h1>
        </div>

        <Card className="p-6">
            {isSubmitted ? (
            <Alert variant="default" className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Check Your Email</AlertTitle>
                <AlertDescription className="text-green-700">
                If an account with that email exists, a password reset link has been sent. Please check your inbox and spam folder.
                </AlertDescription>
            </Alert>
            ) : (
            <>
                <p className="text-center text-muted-foreground mb-6">
                Enter your email address and we will send you a link to reset your password.
                </p>

                {error && (
                <Alert variant="destructive" className="mb-4">
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
                            <Input type="email" placeholder="you@example.com" {...field} disabled={isLoading} />
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
            </>
            )}
        </Card>
      </div>
    </div>
  );
}
