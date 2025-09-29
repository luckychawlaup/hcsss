
"use client"

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format as formatDate } from "date-fns";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Loader2, CalendarIcon, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "../ui/textarea";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { addAdmin } from "@/lib/supabase/admins";

const addAdminSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  dob: z.date({ required_error: "Date of birth is required." }),
  phone_number: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format."),
  address: z.string().min(10, "Address is too short."),
  role: z.enum(["principal", "accountant"], { required_error: "You must select a role."}),
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
      phone_number: "",
      address: "",
    },
  });

  async function onSubmit(values: z.infer<typeof addAdminSchema>) {
    setIsLoading(true);
    setError(null);

    try {
      await addAdmin({
          ...values,
          dob: formatDate(values.dob, "yyyy-MM-dd"),
      });
      
      toast({
        title: "Administrator Added!",
        description: `An account for ${values.name} (${values.role}) has been created and a password reset email has been sent.`,
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
                    <FormItem className="flex flex-col">
                        <FormLabel>Date of Birth</FormLabel>
                        <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button
                                variant={"outline"}
                                className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? (
                                formatDate(field.value, "PPP")
                                ) : (
                                <span>Pick a date</span>
                                )}
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                                date > new Date() || date < new Date("1950-01-01")
                            }
                            initialFocus
                            />
                        </PopoverContent>
                        </Popover>
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
                    name="address"
                    render={({ field }) => (
                    <FormItem className="md:col-span-2">
                        <FormLabel>Address</FormLabel>
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

    