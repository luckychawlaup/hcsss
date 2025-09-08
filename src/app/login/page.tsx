import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
       <div className="w-full max-w-md">
            <h1 className="text-3xl font-bold text-center text-primary mb-2">Welcome Back!</h1>
            <p className="text-center text-muted-foreground mb-8">
                Sign in to access your student dashboard.
            </p>
            <LoginForm />
       </div>
    </div>
  );
}