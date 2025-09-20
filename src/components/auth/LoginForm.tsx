
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  getAuth,
  signInWithEmailAndPassword,
  sendEmailVerification,
  User,
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getRole } from "./AuthProvider";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

interface LoginFormProps {
  role: "student" | "teacher" | "principal" | "owner";
}

const principalEmail = "principal@hcsss.in";
const ownerEmail = "owner@hcsss.in";


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

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const user = userCredential.user;

      // Post-login role validation
      const actualRole = await getRole(user);
      
      // Special handling for principal/owner who might share a role type
      const isPrincipalOrOwner = role === 'principal' || role === 'owner';
      const actualIsPrincipalOrOwner = actualRole === 'principal' || actualRole === 'owner';

      if (isPrincipalOrOwner && !actualIsPrincipalOrOwner) {
          setError("Invalid credentials for this role.");
          await auth.signOut();
          setIsLoading(false);
          return;
      }

      if (!isPrincipalOrOwner && role !== actualRole) {
           setError("Invalid credentials for this role.");
           await auth.signOut();
           setIsLoading(false);
           return;
      }

      // Email verification check for students and teachers
      if (actualRole === 'student' || actualRole === 'teacher') {
        if (!user.emailVerified) {
          setNeedsVerification(true);
          setError(
            "Your email is not verified. A new verification link has been sent."
          );
          await sendEmailVerification(user);
          toast({
            title: "Verification Email Sent",
            description: "Please check your inbox to verify your email address.",
          });
          await auth.signOut();
          setIsLoading(false);
          return;
        }
      }

      // Redirect on success
      if (actualRole === "principal" || actualRole === "owner") {
        router.push("/principal");
      } else if (actualRole === "teacher") {
        router.push("/teacher");
      } else {
        router.push("/");
      }

      toast({
        title: "Login Successful",
        description: `Welcome!`,
      });

      router.refresh();

    } catch (error: any) {
      const errorCode = error.code;
      let errorMessage = "An unknown error occurred.";
      if (
        errorCode === "auth/user-not-found" ||
        errorCode === "auth/wrong-password" ||
        errorCode === "auth/invalid-credential"
      ) {
        errorMessage = "Invalid email or password. Please try again.";
      } else if (errorCode === "auth/too-many-requests") {
        errorMessage =
          "Too many failed login attempts. Account temporarily locked.";
      }
      setError(errorMessage);
      setIsLoading(false);
    }
  }

  return (
    <>
      {error && (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {needsVerification
              ? "Email Verification Required"
              : "Login Failed"}
          </AlertTitle>
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
                    placeholder={
                      role === "principal" ? principalEmail
                      : role === "owner" ? ownerEmail
                      : `${role}@example.com`
                    }
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
            Sign In
          </Button>
        </form>
      </Form>
    </>
  );
}
