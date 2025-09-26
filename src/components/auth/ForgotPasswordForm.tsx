
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getStudentByEmail } from "@/lib/supabase/students";
import { getTeacherByEmail } from "@/lib/supabase/teachers";
import { useRouter } from "next/navigation";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

interface ForgotPasswordFormProps {
    role: "student" | "teacher";
}

export default function ForgotPasswordForm({ role }: ForgotPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const supabase = createClient();
  const router = useRouter();

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
    setIsLoading(true);
    setError(null);

    try {
      // First, check if the user exists in our database
      let userExists = false;
      if (role === 'student') {
        userExists = !!(await getStudentByEmail(values.email));
      } else if (role === 'teacher') {
        userExists = !!(await getTeacherByEmail(values.email));
      }

      if (!userExists) {
        setError("This email address is not registered in our system for the selected role.");
        setIsLoading(false);
        return;
      }
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });

      if(resetError) throw resetError;
      
      toast({
        title: "Password Reset Email Sent",
        description: "Please check your inbox for instructions to reset your password.",
      });
      // Redirect to a page that tells them to check their email
      // and that the link is valid for a short time.
      router.push(`/auth/update-password?email=${encodeURIComponent(values.email)}`);

    } catch (error: any) {
      let errorMessage = "An unknown error occurred.";
      if (error.message.includes("For security purposes, you can only request this once every")) {
        errorMessage = "A password reset email has already been sent recently. Please check your inbox or wait a minute before trying again.";
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }
  
  return (
    <>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
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
                <FormLabel>Registered Email Address</FormLabel>
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
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Reset Link
          </Button>
        </form>
      </Form>
    </>
  );
}
