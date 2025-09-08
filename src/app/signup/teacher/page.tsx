import TeacherSignupForm from "@/components/auth/TeacherSignupForm";
import Link from "next/link";

export default function TeacherSignupPage() {
    return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
       <div className="w-full max-w-md">
            <h1 className="text-3xl font-bold text-center text-primary mb-2">Create Teacher Account</h1>
            <p className="text-center text-muted-foreground mb-8">
                Register as a teacher to get started.
            </p>
            <TeacherSignupForm />
            <p className="mt-4 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-primary hover:underline">
                Sign In
                </Link>
            </p>
       </div>
    </div>
  );
}
