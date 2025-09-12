
import LoginForm from "@/components/auth/LoginForm";
import Link from "next/link";
import Image from "next/image";

export default function StudentLoginPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md flex-1 flex flex-col justify-center">
        <div className="flex flex-col items-center justify-center mb-8">
          <Image src="https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hiltonconventschool_logo.png" alt="Hilton Convent School Logo" width={80} height={80} className="mb-4" />
          <h1 className="text-3xl font-bold text-center text-primary">Student Portal</h1>
          <p className="text-center text-muted-foreground mt-2">
            Sign in with the credentials provided by the school.
          </p>
        </div>
        <LoginForm role="student" />
        <p className="mt-4 text-center text-sm text-muted-foreground">
            Contact school administration if you don't have login details.
        </p>
         <p className="mt-2 text-center text-sm text-muted-foreground">
            <Link href="/auth/student/forgot-password"className="text-xs font-medium text-primary hover:underline">
                Forgot Password?
            </Link>
        </p>
      </div>
       <footer className="py-4">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Hilton Convent School. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
