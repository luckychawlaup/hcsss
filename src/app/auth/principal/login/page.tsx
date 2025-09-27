
"use client";

import LoginForm from "@/components/auth/LoginForm";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function PrincipalLoginPage() {
  const { settings } = useTheme();
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
            <Image src={settings.logoUrl || "https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png"} alt="School Logo" width={80} height={80} className="mb-4 rounded-full mx-auto" priority />
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-bold text-primary">HCSSS</h1>
              <Badge variant="outline" className="border-primary/50 text-primary">Beta</Badge>
            </div>
            <p className="text-muted-foreground">
              Sign in to the administrative portal.
            </p>
        </div>

        <div>
          <LoginForm role="principal" />
        </div>
        
        <div className="text-center">
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
