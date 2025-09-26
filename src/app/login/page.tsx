
"use client";

import Link from "next/link";
import Image from "next/image";
import { User, Briefcase, School, Crown } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Card, CardContent } from "@/components/ui/card";

export default function RoleSelectionPage() {
  const { settings } = useTheme();
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-8">
          <Image src={settings.logoUrl || "https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png"} alt="School Logo" width={90} height={90} className="mb-4 rounded-full" />
          <h1 className="text-3xl font-bold text-center text-primary">{settings.schoolName || "Hilton Convent School"}</h1>
          <p className="text-center text-muted-foreground mt-2">
            Welcome! Please select your role to sign in.
          </p>
        </div>
        
        <Card className="shadow-lg">
          <CardContent className="p-6 space-y-4">
              <Link href="/auth/student/login" className="block">
                  <div className="flex items-center gap-4 rounded-lg border p-4 hover:bg-accent/50 hover:border-primary/50 transition-all duration-200">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <User className="h-6 w-6" />
                      </div>
                      <div>
                          <h2 className="font-semibold text-lg text-foreground">I am a Student</h2>
                          <p className="text-sm text-muted-foreground">Sign in to your student dashboard.</p>
                      </div>
                  </div>
              </Link>
              <Link href="/auth/teacher/login" className="block">
                  <div className="flex items-center gap-4 rounded-lg border p-4 hover:bg-accent/50 hover:border-primary/50 transition-all duration-200">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Briefcase className="h-6 w-6" />
                      </div>
                      <div>
                          <h2 className="font-semibold text-lg text-foreground">I am a Teacher</h2>
                          <p className="text-sm text-muted-foreground">Access your teacher portal.</p>
                      </div>
                  </div>
              </Link>
              <Link href="/auth/principal/login" className="block">
                  <div className="flex items-center gap-4 rounded-lg border p-4 hover:bg-accent/50 hover:border-primary/50 transition-all duration-200">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <School className="h-6 w-6" />
                      </div>
                      <div>
                          <h2 className="font-semibold text-lg text-foreground">I am the Principal</h2>
                          <p className="text-sm text-muted-foreground">Access the admin dashboard.</p>
                      </div>
                  </div>
              </Link>
              <Link href="/auth/owner/login" className="block">
                  <div className="flex items-center gap-4 rounded-lg border p-4 hover:bg-accent/50 hover:border-primary/50 transition-all duration-200">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Crown className="h-6 w-6" />
                      </div>
                      <div>
                          <h2 className="font-semibold text-lg text-foreground">I am the Owner</h2>
                          <p className="text-sm text-muted-foreground">Access the owner's dashboard.</p>
                      </div>
                  </div>
              </Link>
          </CardContent>
        </Card>
      </div>
       <footer className="py-8">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {settings.schoolName || "Hilton Convent School"}. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
