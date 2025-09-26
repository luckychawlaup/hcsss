
"use client";

import { useState, useEffect, Suspense } from "react";
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
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useRouter } from "next/navigation";

const updatePasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters long."),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});


function UpdatePasswordContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const supabase = createClient();
  const { settings } = useTheme();
  const router = useRouter();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        // Supabase client has handled the token from the URL.
        // The form can now be used to update the password.
      } else if (event === "USER_UPDATED") {
          // After a successful password update, sign the user out to force a fresh login.
          await supabase.auth.signOut();
          router.push('/login');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase, router]);

  const form = useForm<z.infer<typeof updatePasswordSchema>>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: z.infer<typeof updatePasswordSchema>) {
    setIsLoading(true);
    setError(null);
    
    const { error: updateError } = await supabase.auth.updateUser({
        password: values.password,
    });

    if (updateError) {
        setError("Your password reset link may be invalid or has expired. Please request a new one.");
        setIsLoading(false);
        return;
    }
      
    setIsSuccess(true);
    toast({
        title: "Password Updated",
        description: "Your password has been changed successfully. You can now log in.",
    });
    
    setIsLoading(false);
  }

  const renderContent = () => {
    if (isSuccess) {
      return (
        <Alert variant="default" className="bg-primary/10 border-primary/20">
          <CheckCircle className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary">Password Updated!</AlertTitle>
          <AlertDescription className="space-y-4">
            Your password has been reset successfully.
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
          <p className="text-center text-muted-foreground mt-2 mb-4">
            You have been securely authenticated. Enter and confirm your new password below.
          </p>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </form>
          </Form>
        </>
      );
  };
  
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md flex-1 flex flex-col justify-center">
        <div className="flex flex-col items-center justify-center mb-8">
          <Image src={settings.logoUrl || "https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png"} alt="School Logo" width={100} height={100} className="mb-4" />
          <h1 className="text-3xl font-bold text-center text-primary">Reset Your Password</h1>
        </div>
        {renderContent()}
      </div>
      <footer className="py-4">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {settings.schoolName || "Hilton Convent School"}. All rights reserved.
        </p>
      </footer>
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
