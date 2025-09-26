
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
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

interface ForgotPasswordFormProps {
    role: "student" | "teacher";
}

export default function ForgotPasswordForm({ role }: ForgotPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const supabase = createClient();

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });

      // For security reasons, don't reveal if an email is registered or not.
      // The resetError is only thrown for unexpected issues like network errors or rate-limiting, not for a non-existent email.
      if(resetError) throw resetError;
      
      setIsSuccess(true);
    } catch (error: any) {
      let errorMessage = "An unknown error occurred. Please try again later.";
      if (error.message.includes("For security purposes, you can only request this once every")) {
        errorMessage = "A password reset email has already been sent recently. Please check your inbox or wait a minute before trying again.";
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }
  
  if (isSuccess) {
    return (
        <Alert variant="default" className="bg-primary/10 border-primary/20">
            <CheckCircle className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">Check your email!</AlertTitle>
            <AlertDescription>
                If an account exists for the email you provided, a password reset link has been sent. Please follow the instructions in the email.
            </AlertDescription>
        </Alert>
    )
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
