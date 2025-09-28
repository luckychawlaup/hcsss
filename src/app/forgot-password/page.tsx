
"use client";

import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function ForgotPasswordPage() {
  const { settings } = useTheme();
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-6">
         <div className="text-center">
            <Image src={settings.logoUrl || "/hcsss.png"} alt="School Logo" width={80} height={80} className="mb-4 rounded-full mx-auto" priority />
            <h1 className="text-2xl font-bold text-primary">HCSSS</h1>
            <p className="text-muted-foreground">
              Enter your email to reset your account password.
            </p>
        </div>

        <div>
          <ForgotPasswordForm role="student" />
        </div>
        
        <div className="text-center">
            <p className="text-center text-sm text-muted-foreground">
              Remembered your password?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign In
              </Link>
            </p>
        </div>
      </div>
    </div>
  );
}
