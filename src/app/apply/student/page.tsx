
"use client";

import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StudentApplicationPage() {
  const { settings } = useTheme();
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-2xl">
        <Card className="shadow-lg">
           <CardHeader className="items-center text-center">
              <Image src={settings.logoUrl || "https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png"} alt="School Logo" width={80} height={80} className="mb-4 rounded-full" />
              <CardTitle className="text-2xl font-bold text-primary">New Admission Registration</CardTitle>
              <CardDescription>
                Fill out the form below to register for the new admission entrance test.
              </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {/* Placeholder for the application form */}
            <div className="text-center text-muted-foreground p-8 border rounded-md">
              <p>New student admission form will be here.</p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-4 p-6 pt-0">
             <Button variant="link" asChild className="text-muted-foreground">
                <Link href="/login">
                    <ArrowLeft className="mr-2"/>
                    Go back to login
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
