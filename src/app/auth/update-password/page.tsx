
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
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

const updatePasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters long."),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export default function UpdatePasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const { settings } = useTheme();

  useEffect(() => {
    // This effect runs once on mount to check if Supabase has detected
    // a password recovery session from the URL fragment.
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
           setHasSession(true);
        } else {
            // If the user navigates here directly without a valid token,
            // we should not show the form.
            setHasSession(false);
        }
      }
    );

    // Initial check in case the event already fired
    supabase.auth.getSession().then(({ data: { session } }) => {
        // This is a bit of a trick. After a password recovery link, Supabase
        // creates a temporary session. We can check for its existence.
        if (session) {
            setHasSession(true);
        }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);


  const form = useForm<z.infer<typeof updatePasswordSchema>>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof updatePasswordSchema>) {
    setIsLoading(true);
    setError(null);
    
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (updateError) throw updateError;
      
      setIsSuccess(true);
      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully. You can now log in.",
      });
      form.reset();
      
      // Sign out to clear the temporary recovery session
      await supabase.auth.signOut();

    } catch (error: any) {
      setError(error.message || "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }
  
  return (
     <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md flex-1 flex flex-col justify-center">
        <div className="flex flex-col items-center justify-center mb-8">
          <Image src={settings.logoUrl || "https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png"} alt="School Logo" width={80} height={80} className="mb-4" />
          <h1 className="text-3xl font-bold text-center text-primary">Update Your Password</h1>
        </div>

        {isSuccess ? (
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
        ) : hasSession ? (
             <>
                <p className="text-center text-muted-foreground mt-2 mb-4">
                    Enter and confirm your new password below.
                </p>
                {error && (
                    <Alert variant="destructive" className="my-4">
                    <AlertCircle className="h-4 w-4" />
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
                            <Input type="password" placeholder="••••••••" {...field} />
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
                            <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Update Password
                    </Button>
                    </form>
                </Form>
            </>
        ) : (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Invalid or Expired Link</AlertTitle>
                <AlertDescription className="space-y-4">
                    The password reset link is either invalid or has expired. Please request a new one.
                    <div className="pt-2">
                        <Button asChild variant="outline">
                            <Link href="/login">Back to Login</Link>
                        </Button>
                    </div>
                </AlertDescription>
            </Alert>
        )}
       
      </div>
      <footer className="py-4">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {settings.schoolName || "Hilton Convent School"}. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
