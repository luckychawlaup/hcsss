
"use client";

import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle, CheckCircle, Mail } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from '@/components/theme/ThemeProvider';

const verifyOtpSchema = z.object({
  token: z.string().min(6, "Code must be 6 digits.").max(6, "Code must be 6 digits."),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

function VerifyOtpContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const { settings } = useTheme();
  const supabase = createClient();

  const form = useForm<z.infer<typeof verifyOtpSchema>>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { token: '', password: '' },
  });

  if (!email) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Missing Information</AlertTitle>
            <AlertDescription>
                Email address is missing. Please start the password reset process again.
                <Button asChild variant="link"><Link href="/login">Return to Login</Link></Button>
            </AlertDescription>
        </Alert>
      </div>
    );
  }

  async function onSubmit(values: z.infer<typeof verifyOtpSchema>) {
    setIsLoading(true);
    setError(null);

    try {
        const { error: verifyError } = await supabase.auth.verifyOtp({
            email,
            token: values.token,
            type: 'recovery',
        });

        if (verifyError) {
            throw new Error("Invalid or expired OTP code. Please try again.");
        }

        const { error: updateError } = await supabase.auth.updateUser({
            password: values.password,
        });

        if (updateError) {
            throw new Error("Failed to update password. Please request a new reset code.");
        }

        setIsSuccess(true);

    } catch (e: any) {
        setError(e.message || "An unexpected error occurred.");
    } finally {
        setIsLoading(false);
    }
  }
  
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-md flex-1 flex flex-col justify-center">
             <div className="flex flex-col items-center justify-center mb-8">
                <Image src={settings.logoUrl || "https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png"} alt="School Logo" width={100} height={100} className="mb-4" />
                <h1 className="text-3xl font-bold text-center text-primary">Verify & Reset Password</h1>
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
            ) : (
                <>
                    <Alert variant="default" className="bg-primary/10 border-primary/20 mb-6">
                        <Mail className="h-4 w-4 text-primary" />
                        <AlertTitle className="text-primary">Check Your Email</AlertTitle>
                        <AlertDescription>
                            We've sent a 6-digit verification code to <strong>{email}</strong>. Please enter it below.
                        </AlertDescription>
                    </Alert>
                    
                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField control={form.control} name="token" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Verification Code</FormLabel>
                                    <FormControl><Input placeholder="123456" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="password" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>New Password</FormLabel>
                                    <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Verify & Update Password
                            </Button>
                        </form>
                    </Form>
                </>
            )}
        </div>
        <footer className="py-4">
            <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} {settings.schoolName || "Hilton Convent School"}. All rights reserved.
            </p>
      </footer>
    </div>
  )
}


export default function VerifyOtpPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <VerifyOtpContent />
        </Suspense>
    )
}
