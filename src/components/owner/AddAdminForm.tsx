
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
import { addAdmin } from "@/lib/supabase/admins";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Separator } from "../ui/separator";
import Image from "next/image";

const addAdminSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  dob: z.string().regex(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/, "Date must be in DD/MM/YYYY format."),
  gender: z.enum(["Male", "Female", "Other"], { required_error: "Please select a gender."}),
  phone_number: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format.").max(13, "Phone number should not exceed 13 digits including country code."),
  address: z.string().optional(),
  role: z.enum(["principal", "accountant"], { required_error: "You must select a role."}),
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
      photo_url: "",
      aadhar_number: "",
      pan_number: "",
      work_experience: "",
      bank_account: {
          accountHolderName: "",
          accountNumber: "",
          ifscCode: "",
          bankName: "",
      }
    },
  });

  const photoUrl = form.watch("photo_url");

  async function onSubmit(values: z.infer<typeof addAdminSchema>) {
    setIsLoading(true);
    setError(null);

    try {
      await addAdmin({
          ...values,
          address: values.address || '',
          photo_url: values.photo_url || undefined,
          aadhar_number: values.aadhar_number || undefined,
          pan_number: values.pan_number || undefined,
          work_experience: values.work_experience || undefined,
          joining_date: values.joining_date.toISOString(),
          bank_account: values.bank_account,
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


            <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                <FormItem className="space-y-3 pt-4">
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
