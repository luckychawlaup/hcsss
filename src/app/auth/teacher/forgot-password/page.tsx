
"use client";

import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";


export default function TeacherForgotPasswordPage() {
    const { settings } = useTheme();
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
            <Image src={settings.logoUrl || "https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png"} alt="School Logo" width={80} height={80} className="mb-4 rounded-full mx-auto" />
            <h1 className="text-2xl font-bold text-primary">HCSSS</h1>
            <p className="text-muted-foreground">
              Enter your email to reset your teacher account password.
            </p>
        </div>

        <div>
          <ForgotPasswordForm role="teacher" />
        </div>
        
        <div className="text-center">
            <p className="text-center text-sm text-muted-foreground">
              Remembered your password?{" "}
              <Link href="/auth/teacher/login" className="font-medium text-primary hover:underline">
                Sign In
              </Link>
            </p>
        </div>
      </div>
    </div>
  );
}
