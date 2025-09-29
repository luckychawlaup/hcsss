
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/lib/supabase/client";
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
import { getRole } from "@/lib/getRole";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type Role = "student" | "teacher" | "principal" | "accountant" | "owner";

interface LoginFormProps {
  role: Role;
}

export default function LoginForm({ role }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

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

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (signInError) throw signInError;
      
      const user = data.user;
      if (!user) throw new Error("Login failed, user not found.");

      const actualRole = await getRole(user);
      
      if (role !== actualRole) {
           setError("Invalid credentials for this role. You are not authorized to access this portal.");
           await supabase.auth.signOut();
           setIsLoading(false);
           return;
      }
      
      if (actualRole !== 'owner' && !user.email_confirmed_at) {
        setError(
          "Your email is not verified. Please check your inbox for the verification link. If you are an admin, ask the owner to resend it."
        );
        toast({
          title: "Email Verification Required",
          description: "Please check your inbox to verify your email address before logging in.",
          variant: "destructive",
        });
        // Do not sign out. Let the user stay in a partial auth state.
        setIsLoading(false);
        return;
      }
      
      toast({
        title: "Login Successful",
        description: `Welcome! Redirecting...`,
      });
      
      let targetPath = '/';
      if (actualRole === 'principal') {
          targetPath = '/principal';
      } else if (actualRole === 'accountant') {
          targetPath = '/accountant';
      } else if (actualRole === 'teacher') {
          targetPath = '/teacher';
      } else if (actualRole === 'owner') {
          targetPath = '/owner';
      }
      
      // Use window.location.href for a hard redirect
      window.location.href = targetPath;

    } catch (error: any) {
      let errorMessage = "An unknown error occurred.";
      if (error.message.includes("Invalid login credentials")) {
        errorMessage = "Invalid email or password. Please try again.";
      } else if (error.message.includes("Email not confirmed")) {
           errorMessage = "Your email is not verified. Please check your inbox for the verification link.";
      }
      setError(errorMessage);
    } finally {
        // This may not be reached if redirect happens, which is fine
        setIsLoading(false);
    }
  }
  
  return (
    <>
      {error && (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Login Failed</AlertTitle>
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
                      role === "principal" || role === "accountant" || role === "owner"
                      ? "admin@example.com"
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
                  <Input 
                    type="password"
                    placeholder={'••••••••'}
                    {...field}
                  />
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
