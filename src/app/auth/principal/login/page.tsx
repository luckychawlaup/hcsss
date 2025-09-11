
import LoginForm from "@/components/auth/LoginForm";
import { GraduationCap } from "lucide-react";
import Link from "next/link";

export default function PrincipalLoginPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground mb-4">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-center text-primary">Principal Dashboard</h1>
          <p className="text-center text-muted-foreground mt-2">
            Sign in to the administrative portal.
          </p>
        </div>
        <LoginForm role="principal" />
         <p className="mt-4 text-center text-sm text-muted-foreground">
             <Link href="/login" className="text-xs font-medium text-primary hover:underline">
                Go back to role selection
            </Link>
        </p>
      </div>
    </div>
  );
}
