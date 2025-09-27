
"use client";

import LoginForm from "@/components/auth/LoginForm";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TeacherLoginPage() {
    const { settings } = useTheme();
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
       <div className="w-full max-w-md space-y-6">
        <div className="text-center">
            <Image src={settings.logoUrl || "https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png"} alt="School Logo" width={80} height={80} className="mb-4 rounded-full mx-auto" priority />
            <h1 className="text-2xl font-bold text-primary">HCSSS</h1>
            <p className="text-muted-foreground">
              Sign in with the details provided by the school.
            </p>
        </div>

        <div>
          <LoginForm role="teacher" />
        </div>
        
        <div className="flex flex-col items-center gap-4">
           <p className="text-sm text-muted-foreground">
              <Link href="/auth/teacher/forgot-password"className="font-medium text-primary hover:underline">
                  Forgot Password?
              </Link>
          </p>
           <Button variant="link" asChild className="text-muted-foreground">
              <Link href="/login">
                  <ArrowLeft className="mr-2"/>
                  Go back to role selection
              </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
