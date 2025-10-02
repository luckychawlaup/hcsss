
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
import { getSchoolInfo, updateSchoolInfo, SchoolInfo } from "@/lib/supabase/schoolInfo";
import { Skeleton } from "../ui/skeleton";

const infoSchema = z.object({
  name: z.string().min(5, "School name is required."),
  email: z.string().email("Invalid email address."),
  phone: z.string().min(10, "Phone number is required."),
  address: z.string().min(10, "Address is required."),
  affiliation_no: z.string().min(1, "Affiliation number is required."),
  school_code: z.string().min(1, "School code is required."),
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

export default function SchoolInfoForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof infoSchema>>({
    resolver: zodResolver(infoSchema),
    defaultValues: {
        name: "",
        email: "",
        phone: "",
        address: "",
        affiliation_no: "",
        school_code: "",
    }
  });

  useEffect(() => {
    async function fetchInfo() {
        setIsFetching(true);
        const currentInfo = await getSchoolInfo();
        if (currentInfo) {
            form.reset(currentInfo);
        }
        setIsFetching(false);
    }
    fetchInfo();
  }, [form]);


  async function onSubmit(values: z.infer<typeof infoSchema>) {
    setIsLoading(true);
    setError(null);

    try {
      await updateSchoolInfo(values);
      toast({
        title: "Information Updated!",
        description: "Your school's public information has been updated.",
      });
    } catch (e: any) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }
  
  if (isFetching) {
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
            name="name"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Public Email</FormLabel>
                    <FormControl>
                    <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Public Phone Number</FormLabel>
                    <FormControl>
                    <Input {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
          </div>
           <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>School Address</FormLabel>
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
                name="affiliation_no"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>CBSE Affiliation No.</FormLabel>
                    <FormControl>
                    <Input {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="school_code"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>School Code</FormLabel>
                    <FormControl>
                    <Input {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Information
          </Button>
        </form>
      </Form>
    </>
  );
}
