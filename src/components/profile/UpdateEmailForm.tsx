
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/lib/supabase/client";
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
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const updateEmailSchema = z.object({
  newEmail: z.string().email("Please enter a valid email address."),
});

interface UpdateEmailFormProps {
    currentEmail: string;
}

export function UpdateEmailForm({ currentEmail }: UpdateEmailFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof updateEmailSchema>>({
    resolver: zodResolver(updateEmailSchema),
    defaultValues: { newEmail: "" },
  });

  async function onSubmit(values: z.infer<typeof updateEmailSchema>) {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    if (values.newEmail === currentEmail) {
        setError("New email must be different from the current email.");
        setIsLoading(false);
        return;
    }

    try {
        const { error: updateError } = await supabase.auth.updateUser(
            { email: values.newEmail }
        );

        if (updateError) throw updateError;
        
        setSuccess(true);
        toast({
            title: "Confirmation Required",
            description: "A confirmation link has been sent to both your old and new email addresses.",
        });
        form.reset();

    } catch (e: any) {
        setError(`Failed to update email: ${e.message}`);
    } finally {
        setIsLoading(false);
    }
  }

  if (success) {
      return (
          <Alert variant="default" className="bg-primary/10 border-primary/20">
            <CheckCircle className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">Check Your Email</AlertTitle>
            <AlertDescription>
                A confirmation link has been sent to your new email address. Please click the link to finalize the change.
            </AlertDescription>
        </Alert>
      )
  }

  return (
    <>
      <p className="text-sm text-muted-foreground mb-4">Current email: <span className="font-semibold text-foreground">{currentEmail}</span></p>
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
            name="newEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Email Address</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="Enter your new email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Change Email
          </Button>
        </form>
      </Form>
    </>
  );
}
