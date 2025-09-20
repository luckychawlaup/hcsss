
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { getSchoolSettingsRT, updateSchoolSettings } from "@/lib/supabase/settings";
import type { SchoolSettings } from "@/lib/supabase/settings";
import { Skeleton } from "../ui/skeleton";
import { useRouter } from "next/navigation";

const settingsSchema = z.object({
  schoolName: z.string().min(5, "School name must be at least 5 characters long."),
  logoUrl: z.string().url("Please enter a valid URL for the logo."),
  primaryColor: z.string().regex(/^hsl\(\d+, \d+%, \d+%\)$/, "Color must be in HSL format (e.g., hsl(217, 91%, 60%))"),
  accentColor: z.string().regex(/^hsl\(\d+, \d+%, \d+%\)$/, "Color must be in HSL format (e.g., hsl(258, 90%, 66%))"),
});

function SettingsSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-32" />
        </div>
    )
}

export default function SchoolSettingsForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
        schoolName: "",
        logoUrl: "",
        primaryColor: "",
        accentColor: "",
    }
  });

  useEffect(() => {
    const unsubscribe = getSchoolSettingsRT((currentSettings) => {
        setSettings(currentSettings);
        form.reset(currentSettings);
    });
    return () => {
        if (unsubscribe && typeof unsubscribe.unsubscribe === 'function') {
            unsubscribe.unsubscribe();
        }
    }
  }, [form]);


  async function onSubmit(values: z.infer<typeof settingsSchema>) {
    setIsLoading(true);
    setError(null);

    try {
      await updateSchoolSettings(values);
      toast({
        title: "Settings Updated!",
        description: "Your school's branding has been updated. Changes will be visible on next refresh.",
      });
      router.refresh();
    } catch (e: any) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }
  
  if (!settings) {
      return <SettingsSkeleton />;
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="schoolName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>School Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="logoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Logo URL</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={form.control}
                name="primaryColor"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Primary Color (HSL)</FormLabel>
                    <FormControl>
                    <Input {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="accentColor"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Accent Color (HSL)</FormLabel>
                    <FormControl>
                    <Input {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </form>
      </Form>
    </>
  );
}
