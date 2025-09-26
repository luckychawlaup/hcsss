
"use client";

import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

export default function StudentForgotPasswordPage() {
  const { settings } = useTheme();
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
           <CardHeader className="items-center text-center">
              <Image src={settings.logoUrl || "https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png"} alt="School Logo" width={80} height={80} className="mb-4 rounded-full" />
              <CardTitle className="text-2xl font-bold text-primary">Forgot Password</CardTitle>
              <CardDescription>
                Enter your email to reset your student account password.
              </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <ForgotPasswordForm role="student" />
          </CardContent>
          <CardFooter className="flex justify-center p-6 pt-0">
             <p className="text-center text-sm text-muted-foreground">
                Remembered your password?{" "}
                <Link href="/auth/student/login" className="font-medium text-primary hover:underline">
                  Sign In
                </Link>
              </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
