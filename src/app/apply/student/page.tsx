
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";

import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Loader2, CheckCircle, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";


const studentApplicationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  fatherName: z.string().min(2, "Father's name is required."),
  motherName: z.string().min(2, "Mother's name is required."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number."),
  dob: z.date({
    required_error: "Date of birth is required.",
  }),
  address: z.string().min(10, "Address is too short."),
  previousSchool: z.string().optional(),
  classAppliedFor: z.string({ required_error: "Please select a class."}),
});

const classes = ["Nursery", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];

export default function StudentApplicationPage() {
  const { settings } = useTheme();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const form = useForm<z.infer<typeof studentApplicationSchema>>({
    resolver: zodResolver(studentApplicationSchema),
    defaultValues: {
      name: "",
      fatherName: "",
      motherName: "",
      email: "",
      phone: "",
      address: "",
      previousSchool: "",
    },
  });
  
  async function onSubmit(values: z.infer<typeof studentApplicationSchema>) {
    setIsSubmitting(true);
    // In a real app, you would send this data to your backend
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log({ ...values, dob: format(values.dob, "yyyy-MM-dd") });
    setIsSubmitting(false);
    setIsSuccess(true);
    toast({
      title: "Application Submitted!",
      description: "We have received your application and will contact you shortly.",
    });
  }

  const renderForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Student's full name" {...field} /></FormControl><FormMessage /></FormItem>
          )}/>
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
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("2000-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="fatherName" render={({ field }) => (
              <FormItem><FormLabel>Father's Name</FormLabel><FormControl><Input placeholder="Father's full name" {...field} /></FormControl><FormMessage /></FormItem>
          )}/>
          <FormField control={form.control} name="motherName" render={({ field }) => (
              <FormItem><FormLabel>Mother's Name</FormLabel><FormControl><Input placeholder="Mother's full name" {...field} /></FormControl><FormMessage /></FormItem>
          )}/>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="parent@example.com" {...field} /></FormControl><FormMessage /></FormItem>
          )}/>
          <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem><FormLabel>Contact Phone</FormLabel><FormControl><Input type="tel" placeholder="+91..." {...field} /></FormControl><FormMessage /></FormItem>
          )}/>
        </div>
        <FormField control={form.control} name="address" render={({ field }) => (
            <FormItem><FormLabel>Full Address</FormLabel><FormControl><Textarea placeholder="Your complete residential address" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="classAppliedFor" render={({ field }) => (
              <FormItem><FormLabel>Applying for Class</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger></FormControl>
                  <SelectContent>{classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select><FormMessage />
              </FormItem>
          )}/>
          <FormField control={form.control} name="previousSchool" render={({ field }) => (
              <FormItem><FormLabel>Previous School (if any)</FormLabel><FormControl><Input placeholder="Name of previous school" {...field} /></FormControl><FormMessage /></FormItem>
          )}/>
        </div>
        <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Submitting...</> : "Submit Application"}
        </Button>
      </form>
    </Form>
  );

  const renderSuccess = () => (
    <Alert variant="default" className="bg-primary/10 border-primary/20 text-center">
        <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-primary" />
        </div>
        <AlertTitle className="text-primary text-xl">Application Received!</AlertTitle>
        <AlertDescription className="space-y-4">
            Thank you for your interest in HCSSS. We have received your application and will review it shortly. We will contact you regarding the date and time for the entrance test.
        </AlertDescription>
    </Alert>
  );

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
            <Image src={settings.logoUrl || "https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png"} alt="School Logo" width={80} height={80} className="mb-4 rounded-full mx-auto" priority />
            <h1 className="text-2xl font-bold text-primary">HCSSS</h1>
            <p className="text-muted-foreground">
              Fill out the form below to register for the new admission entrance test.
            </p>
        </div>

        <div>
            {isSuccess ? renderSuccess() : renderForm()}
        </div>
        
        <div className="text-center">
            <Button variant="link" asChild className="text-muted-foreground">
              <Link href="/login">
                  <ArrowLeft className="mr-2"/>
                  Go back to login
              </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
