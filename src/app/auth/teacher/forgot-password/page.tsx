
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import Link from "next/link";
import Image from "next/image";

export default function TeacherForgotPasswordPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary-foreground mb-4">
             <Image src="/logo.png" alt="Hilton Convent School Logo" width={64} height={64} />
          </div>
          <h1 className="text-3xl font-bold text-center text-primary">Forgot Password</h1>
           <p className="text-center text-muted-foreground mt-2">
            Enter your email to reset your teacher account password.
          </p>
        </div>
        <ForgotPasswordForm role="teacher" />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Remembered your password?{" "}
          <Link href="/auth/teacher/login" className="font-medium text-primary hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
