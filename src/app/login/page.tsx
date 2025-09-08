import AuthTabs from "@/components/auth/AuthTabs";
import { GraduationCap } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
       <div className="w-full max-w-md">
            <div className="flex flex-col items-center justify-center mb-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground mb-4">
                    <GraduationCap className="h-8 w-8" />
                </div>
                <h1 className="text-3xl font-bold text-center text-primary">Hilton Convent School</h1>
                <p className="text-center text-muted-foreground mt-2">
                    Select your role to sign in to your dashboard.
                </p>
            </div>
            <AuthTabs />
       </div>
    </div>
  );
}
