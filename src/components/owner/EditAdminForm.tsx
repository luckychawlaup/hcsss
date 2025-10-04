
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
import { Loader2, CalendarIcon, AlertCircle, Landmark } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "../ui/textarea";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { updateAdmin, AdminUser } from "@/lib/supabase/admins";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { format, parseISO } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Separator } from "../ui/separator";
import Image from "next/image";

const editAdminSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  dob: z.string().regex(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/, "Date must be in DD/MM/YYYY format."),
  gender: z.enum(["Male", "Female", "Other"], { required_error: "Please select a gender."}),
  phone_number: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format.").max(13, "Phone number should not exceed 13 digits including country code."),
  address: z.string().optional(),
  joining_date: z.date({ required_error: "Joining date is required."}),
  photo_url: z.string().url("Please enter a valid URL or leave it empty.").optional().or(z.literal('')),
  aadhar_number: z.string().length(12, "Aadhar number must be exactly 12 digits.").regex(/^\d+$/, "Aadhar must only contain numbers.").optional().or(z.literal('')),
  pan_number: z.string().length(10, "PAN must be exactly 10 characters.").optional().or(z.literal('')),
  work_experience: z.string().optional(),
  bank_account: z.object({
      accountHolderName: z.string().optional(),
      accountNumber: z.string().optional(),
      ifscCode: z.string().optional(),
      bankName: z.string().optional(),
  }).optional(),
});

interface EditAdminFormProps {
    admin: AdminUser;
    onAdminUpdated: () => void;
}

export default function EditAdminForm({ admin, onAdminUpdated }: EditAdminFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof editAdminSchema>>({
    resolver: zodResolver(editAdminSchema),
    defaultValues: {
      ...admin,
      joining_date: admin.joining_date ? parseISO(admin.joining_date) : new Date(),
      bank_account: admin.bank_account || {
          accountHolderName: "",
          accountNumber: "",
          ifscCode: "",
          bankName: "",
      },
    },
  });

  const photoUrl = form.watch("photo_url");

  async function onSubmit(values: z.infer<typeof editAdminSchema>) {
    setIsLoading(true);
    setError(null);

    try {
      await updateAdmin(admin.uid, {
          ...values,
          joining_date: values.joining_date.toISOString(),
      });
      
      toast({
        title: "Administrator Updated!",
        description: `Details for ${values.name} have been updated.`,
      });
      onAdminUpdated();
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred.");
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
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                           <SelectItem value="Male">Male</SelectItem>
                           <SelectItem value="Female">Female</SelectItem>
                           <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
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
                        <Input type="tel" maxLength={13} placeholder="With country code, e.g. +91..." {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="joining_date"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Date of Joining</FormLabel>
                        <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button
                                variant={"outline"}
                                className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>
                                {field.value ? (format(field.value, "PPP")) : (<span>Pick a date</span>)}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
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
                    name="address"
                    render={({ field }) => (
                    <FormItem className="md:col-span-2">
                        <FormLabel>Address (Optional)</FormLabel>
                        <FormControl>
                        <Textarea placeholder="Enter full address" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="work_experience"
                    render={({ field }) => (
                    <FormItem className="md:col-span-2">
                        <FormLabel>Work Experience (Optional)</FormLabel>
                        <FormControl>
                        <Textarea placeholder="Describe previous roles and experiences..." {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="photo_url"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Admin Photo URL (Optional)</FormLabel>
                        <div className="flex items-center gap-4">
                            <FormControl className="flex-1">
                                <Input placeholder="https://example.com/photo.jpg" {...field} />
                            </FormControl>
                            {photoUrl && (
                                <Image 
                                    src={photoUrl} 
                                    alt="Preview"
                                    width={40}
                                    height={40}
                                    className="rounded-full object-cover"
                                />
                            )}
                        </div>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="aadhar_number"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Aadhar Number (Optional)</FormLabel>
                        <FormControl>
                            <Input type="text" maxLength={12} placeholder="12-digit Aadhar number" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="pan_number"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>PAN Number (Optional)</FormLabel>
                        <FormControl>
                            <Input type="text" maxLength={10} placeholder="10-character PAN" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
            <Separator />
             <p className="font-semibold text-foreground flex items-center gap-2 pt-2"><Landmark/> Bank Account Details (for salary)</p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                 <FormField
                    control={form.control}
                    name="bank_account.accountHolderName"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Account Holder Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="bank_account.accountNumber"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Account Number</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="bank_account.ifscCode"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>IFSC Code</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="bank_account.bankName"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Bank Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
            
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </form>
      </Form>
    </>
  );
}
