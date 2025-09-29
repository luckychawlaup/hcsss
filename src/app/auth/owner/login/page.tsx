
"use client";

import Link from "next/link";
import Image from "next/image";
import LoginForm from "@/components/auth/LoginForm";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OwnerLoginPage() {
  const router = useRouter();
  
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
          <h1 className="text-2xl font-bold text-primary">Owner Sign In</h1>
          <p className="text-muted-foreground">
            Please enter your administrative credentials.
          </p>
        </div>

        <div>
          <LoginForm role="owner" />
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
