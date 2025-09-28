
"use client";

import Link from "next/link";
import Image from "next/image";
import LoginForm from "@/components/auth/LoginForm";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

function capitalize(s: string) {
  if (typeof s !== 'string' || s.length === 0) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function LoginPage() {
  const params = useParams();
  const router = useRouter();
  
  const role = Array.isArray(params.role) ? params.role[0] : params.role;

  if (!role || !["student", "teacher", "principal", "accountant"].includes(role)) {
    // Or redirect to a generic login/error page
    return <div>Invalid role specified.</div>;
  }
  
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
       <Button variant="ghost" onClick={() => router.push('/login')} className="absolute top-4 left-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Role Selection
      </Button>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Image
            src={"/hcsss.png"}
            alt="School Logo"
            width={80}
            height={80}
            className="mb-4 rounded-full mx-auto"
            priority
          />
          <h1 className="text-2xl font-bold text-primary">{capitalize(role)} Sign In</h1>
          <p className="text-muted-foreground">
            Welcome back! Please enter your credentials.
          </p>
        </div>

        <div>
          <LoginForm role={role as "student" | "teacher" | "principal" | "accountant"} />
        </div>

        <div className="text-center text-sm text-muted-foreground">
            <Link href="/forgot-password" passHref>
                 <span className="font-medium text-primary hover:underline cursor-pointer">Forgot Password?</span>
            </Link>
        </div>
      </div>
    </div>
  );
}
