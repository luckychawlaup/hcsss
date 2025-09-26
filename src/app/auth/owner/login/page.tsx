
"use client";

import LoginForm from "@/components/auth/LoginForm";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OwnerLoginPage() {
  const { settings } = useTheme();
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
           <CardHeader className="items-center text-center">
              <Image src={settings.logoUrl || "https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png"} alt="School Logo" width={80} height={80} className="mb-4 rounded-full" />
              <CardTitle className="text-2xl font-bold text-primary">Owner Dashboard</CardTitle>
              <CardDescription>
                Sign in to the owner's portal.
              </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <LoginForm role="owner" />
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-4 p-6 pt-0">
             <Button variant="link" asChild className="text-muted-foreground">
                <Link href="/login">
                    <ArrowLeft className="mr-2"/>
                    Go back to role selection
                </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
       <footer className="py-8 text-center text-xs text-muted-foreground absolute bottom-0 w-full">
        <p>
          © {new Date().getFullYear()} {settings.schoolName || "Hilton Convent School"}. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
