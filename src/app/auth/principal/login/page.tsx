
import LoginForm from "@/components/auth/LoginForm";
import Image from "next/image";
import Link from "next/link";

export default function PrincipalLoginPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary-foreground mb-4">
             <Image src="/logo.png" alt="Hilton Convent School Logo" width={64} height={64} />
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
