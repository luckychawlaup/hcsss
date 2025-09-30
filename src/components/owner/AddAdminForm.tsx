
"use client"

import { useState } from "react";
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
import { cn } from "@/lib/utils";
import { Loader2, CalendarIcon, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "../ui/textarea";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { addAdmin } from "@/lib/supabase/admins";

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const PHOTO_FILE_TYPES = ["image/jpeg", "image/png", "image/jpg"];

const addAdminSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  dob: z.string().regex(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/, "Date must be in DD/MM/YYYY format."),
  phone_number: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format."),
  address: z.string().optional(),
  role: z.enum(["principal", "accountant"], { required_error: "You must select a role."}),
  photo: z.any()
    .refine((files) => files?.length == 1, "Profile photo is required.")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `Max photo size is 1MB.`)
    .refine(
      (files) => PHOTO_FILE_TYPES.includes(files?.[0]?.type),
      "Only .jpg, .png formats are supported for photos."
    ),
});

interface AddAdminFormProps {
    onAdminAdded: () => void;
}

export default function AddAdminForm({ onAdminAdded }: AddAdminFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof addAdminSchema>>({
    resolver: zodResolver(addAdminSchema),
    defaultValues: {
      name: "",
      email: "",
      dob: "",
      phone_number: "",
      address: "",
      role: "principal",
    },
  });

  async function onSubmit(values: z.infer<typeof addAdminSchema>) {
    setIsLoading(true);
    setError(null);

    try {
      await addAdmin({
          ...values,
          address: values.address || '',
          photo: values.photo[0]
      });
      
      toast({
        title: "Administrator Account Created!",
        description: `An account for ${values.name} (${values.role}) has been created.`,
      });
      form.reset();
      onAdminAdded();
    } catch (e: any) {
        let errorMessage = `An unexpected error occurred: ${e.message}`;
        if (e.message.includes('User already registered')) {
            errorMessage = "This email is already in use by another account.";
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
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                        <Input placeholder="admin@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                  control={form.control}
                  name="dob"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input placeholder="DD/MM/YYYY" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                    control={form.control}
                    name="phone_number"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                        <Input placeholder="+91 12345 67890" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="photo"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Admin Photo</FormLabel>
                        <FormControl>
                            <Input type="file" accept="image/png, image/jpeg, image/jpg" {...form.register("photo")} />
                        </FormControl>
                         <p className="text-xs text-muted-foreground">PNG, JPG up to 1MB. Recommended 500x500.</p>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Address (Optional)</FormLabel>
                        <FormControl>
                        <Textarea placeholder="Enter full address" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>

            <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                <FormItem className="space-y-3">
                    <FormLabel>Select Role to Assign</FormLabel>
                    <FormControl>
                        <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex items-center space-x-4 pt-2"
                        >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="principal" />
                                </FormControl>
                                <FormLabel className="font-normal">Principal</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="accountant" />
                                </FormControl>
                                <FormLabel className="font-normal">Accountant</FormLabel>
                            </FormItem>
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Administrator
          </Button>
        </form>
      </Form>
    </>
  );
}
