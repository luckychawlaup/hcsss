
import LoginForm from "@/components/auth/LoginForm";
import Link from "next/link";
import Image from "next/image";
import { getSchoolSettings } from "@/lib/firebase/settings";

export default async function StudentLoginPage() {
  const settings = await getSchoolSettings();
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md flex-1 flex flex-col justify-center">
        <div className="flex flex-col items-center justify-center mb-8">
          <Image src={settings.logoUrl || "https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png"} alt="School Logo" width={80} height={80} className="mb-4" />
          <h1 className="text-3xl font-bold text-center text-primary">Student Portal</h1>
          <p className="text-center text-muted-foreground mt-2">
            Sign in with the credentials provided by the school.
          </p>
        </div>
        <LoginForm role="student" />
        <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>
                First time logging in?{" "}
                <Link href="/auth/student/register" className="font-medium text-primary hover:underline">
                    Register your account
                </Link>
            </p>
            <p className="mt-2">
                <Link href="/auth/student/forgot-password"className="text-xs font-medium text-primary hover:underline">
                    Forgot Password?
                </Link>
            </p>
        </div>
      </div>
       <footer className="py-4">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {settings.schoolName || "Hilton Convent School"}. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
