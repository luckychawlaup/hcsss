
import LoginForm from "@/components/auth/LoginForm";
import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function StudentLoginPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground mb-4">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-center text-primary">Student Portal</h1>
          <p className="text-center text-muted-foreground mt-2">
            Sign in to access your dashboard.
          </p>
        </div>
        <LoginForm role="student" />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/auth/student/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>
         <p className="mt-2 text-center text-sm text-muted-foreground">
            <Link href="/auth/student/forgot-password"className="text-xs font-medium text-primary hover:underline">
                Forgot Password?
            </Link>
        </p>
      </div>
    </div>
  );
}
