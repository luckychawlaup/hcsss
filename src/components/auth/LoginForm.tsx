"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  getAuth,
  signInWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { app } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

interface LoginFormProps {
  role: "student" | "teacher" | "principal";
}

export default function LoginForm({ role }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const auth = getAuth(app);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    setError(null);
    setNeedsVerification(false);

    // Hardcoded Principal Login
    if (
      role === "principal" &&
      values.email === "principal@hcsss.com" &&
      values.password === "000000"
    ) {
      // Set a generic user cookie and a specific role cookie for the principal
      document.cookie = "firebase-user=true; path=/; max-age=86400"; // Expires in 1 day
      document.cookie = "principal-role=true; path=/; max-age=86400";
      toast({
        title: "Login Successful",
        description: "Welcome, Principal!",
      });
      router.push("/principal");
      router.refresh();
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );

      const user = userCredential.user;

      if (!user.emailVerified) {
        setNeedsVerification(true);
        setError("Your email is not verified. Please check your inbox for a verification link.");
        // Resend verification email
        await sendEmailVerification(user);
        toast({
          title: "Verification Email Sent",
          description: "Please check your inbox to verify your email address before logging in.",
        });
        setIsLoading(false);
        return;
      }

      // Store a cookie to simulate session
      document.cookie = "firebase-user=true; path=/; max-age=86400";

      toast({
        title: "Login Successful",
        description: `Welcome back!`,
      });

      // Redirect to the appropriate dashboard
      if (role === 'principal') {
        document.cookie = "principal-role=true; path=/; max-age=86400";
        router.push("/principal");
      } else if (role === 'teacher') {
        document.cookie = "teacher-role=true; path=/; max-age=86400";
        router.push("/teacher");
      }
      else {
        router.push("/");
      }
      router.refresh();


    } catch (error: any) {
      const errorCode = error.code;
      let errorMessage = "An unknown error occurred.";
      if (errorCode === "auth/user-not-found" || errorCode === "auth/wrong-password" || errorCode === "auth/invalid-credential") {
        errorMessage = "Invalid email or password. Please try again.";
      } else if (errorCode === "auth/too-many-requests") {
        errorMessage = "Too many failed login attempts. Please try again later.";
      }
      setError(errorMessage);
      setIsLoading(false);
    }
  }

  return (
    <>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder={`${role}@example.com`}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In as {role.charAt(0).toUpperCase() + role.slice(1)}
          </Button>
        </form>
      </Form>
    </>
  );
}
