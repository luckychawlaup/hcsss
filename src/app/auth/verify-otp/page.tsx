
"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
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
import { Loader2, AlertCircle, CheckCircle, KeyRound, ShieldCheck, Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const otpSchema = z.object({
  token: z.string().min(6, "OTP must be 6 digits.").max(6, "OTP must be 6 digits."),
});

const passwordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters long."),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

function VerifyOtpContent() {
  const [step, setStep] = useState<"verify" | "update">("verify");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const { settings } = useTheme();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { token: "" },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function handleOtpSubmit(values: z.infer<typeof otpSchema>) {
    setIsLoading(true);
    setError(null);
    if (!email) {
      setError("Email not found in URL. Please start over.");
      setIsLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: values.token,
        type: 'recovery',
    });

    if (verifyError) {
        setError(verifyError.message === 'Token has expired or is invalid' ? 'Invalid or expired OTP. Please try again.' : 'An unknown error occurred.');
        setIsLoading(false);
        return;
    }

    setStep("update");
    setIsLoading(false);
  }

  async function handlePasswordSubmit(values: z.infer<typeof passwordSchema>) {
    setIsLoading(true);
    setError(null);

     const { error: updateError } = await supabase.auth.updateUser({
        password: values.password,
    });

    if (updateError) {
        setError("Failed to update password. Please try again.");
        setIsLoading(false);
        return;
    }

    setIsSuccess(true);
    await supabase.auth.signOut();
    setIsLoading(false);
  }

  const renderSuccess = () => (
    <Alert variant="default" className="bg-primary/10 border-primary/20">
      <CheckCircle className="h-4 w-4 text-primary" />
      <AlertTitle className="text-primary">Password Reset Successful!</AlertTitle>
      <AlertDescription className="space-y-4">
        Your password has been changed. You can now log in with your new password.
        <div className="pt-2">
          <Button asChild>
            <Link href="/login">Proceed to Login</Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );

  const renderOtpForm = () => (
    <>
      <p className="text-sm text-center text-muted-foreground pb-4">
        A 6-digit code has been sent to <strong>{email}</strong>. Please note that email delivery may take a few minutes.
      </p>
      <Form {...otpForm}>
        <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-4">
          <FormField
            control={otpForm.control}
            name="token"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Verification Code (OTP)</FormLabel>
                <FormControl>
                  <Input placeholder="123456" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify Code
          </Button>
        </form>
      </Form>
    </>
  );

  const renderPasswordForm = () => (
     <Form {...passwordForm}>
        <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
          <FormField control={passwordForm.control} name="password" render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm New Password</FormLabel>
              <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Set New Password
          </Button>
        </form>
      </Form>
  );
  
  const titles = {
    verify: { icon: <KeyRound />, title: "Check Your Email", description: "Enter the code we sent to your inbox." },
    update: { icon: <Lock />, title: "Set New Password", description: "Your code was verified. Set a new password." }
  };
  const currentStepInfo = titles[step];


  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
         <Card className="shadow-lg">
           <CardHeader className="items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                {isSuccess ? <ShieldCheck className="h-8 w-8"/> : currentStepInfo.icon}
              </div>
              <CardTitle className="text-2xl font-bold text-primary">{isSuccess ? "Success!" : currentStepInfo.title}</CardTitle>
              <CardDescription>
                {isSuccess ? "You can now log in." : currentStepInfo.description}
              </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {isSuccess ? renderSuccess() : (
                step === "verify" ? renderOtpForm() : renderPasswordForm()
            )}
          </CardContent>
        </Card>
      </div>
       <footer className="py-8">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {settings.schoolName || "Hilton Convent School"}. All rights reserved.
        </p>
      </footer>
    </div>
  );
}


export default function VerifyOtpPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <VerifyOtpContent />
        </Suspense>
    )
}
