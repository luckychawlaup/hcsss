import AuthTabs from "@/components/auth/AuthTabs";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
       <div className="w-full max-w-md">
            <h1 className="text-3xl font-bold text-center text-primary mb-2">Welcome!</h1>
            <p className="text-center text-muted-foreground mb-8">
                Select your role to sign in.
            </p>
            <AuthTabs />
       </div>
    </div>
  );
}
