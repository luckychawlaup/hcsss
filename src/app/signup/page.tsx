import SignupForm from "@/components/auth/SignupForm";

export default function SignupPage() {
    return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
       <div className="w-full max-w-md">
            <h1 className="text-3xl font-bold text-center text-primary mb-2">Create Your Account</h1>
            <p className="text-center text-muted-foreground mb-8">
                Join the student community. It's quick and easy.
            </p>
            <SignupForm />
       </div>
    </div>
  );
}