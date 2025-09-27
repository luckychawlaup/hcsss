
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Loader2, CheckCircle, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import ImageKitUpload, { type IKResponse } from "@/components/ImageKitUpload";

const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const teacherApplicationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number."),
  qualifications: z.string().min(5, "Please list your qualifications."),
  experience: z.string().min(1, "Please enter your years of experience."),
  subject: z.string().min(2, "Please specify the subject you are applying for."),
  cv: z.any()
    .refine((files) => files?.length == 1, "CV is required.")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => ACCEPTED_FILE_TYPES.includes(files?.[0]?.type),
      "Only .jpg, .png, .pdf, and .doc/docx formats are supported."
    ),
});

export default function TeacherApplicationPage() {
  const { settings } = useTheme();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const form = useForm<z.infer<typeof teacherApplicationSchema>>({
    resolver: zodResolver(teacherApplicationSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      qualifications: "",
      experience: "0",
      subject: "",
    },
  });

  const { control, handleSubmit, setValue } = form;

  const handleUploadSuccess = (res: IKResponse) => {
    console.log("Uploaded CV URL:", res.url);
    // In a real app, you'd store this URL with the form data.
  };

  const handleUploadError = (err: any) => {
    console.error("Upload error:", err);
    toast({
      variant: "destructive",
      title: "Upload Failed",
      description: "Could not upload your CV. Please try again.",
    });
  };
  
  async function onSubmit(values: z.infer<typeof teacherApplicationSchema>) {
    setIsSubmitting(true);
    // In a real app, you would first trigger the upload of the CV,
    // get the URL, and then submit the form values along with the CV URL to your backend.
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(values);
    
    setIsSubmitting(false);
    setIsSuccess(true);
    toast({
      title: "Application Submitted!",
      description: "We have received your application and will contact you if your profile is shortlisted for an interview.",
    });
  }

  const renderForm = () => (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Your full name" {...field} /></FormControl><FormMessage /></FormItem>
          )}/>
          <FormField control={control} name="subject" render={({ field }) => (
              <FormItem><FormLabel>Subject Applied For</FormLabel><FormControl><Input placeholder="e.g., Mathematics" {...field} /></FormControl><FormMessage /></FormItem>
          )}/>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="you@example.com" {...field} /></FormControl><FormMessage /></FormItem>
          )}/>
          <FormField control={control} name="phone" render={({ field }) => (
              <FormItem><FormLabel>Contact Phone</FormLabel><FormControl><Input type="tel" placeholder="+91..." {...field} /></FormControl><FormMessage /></FormItem>
          )}/>
        </div>
        <FormField control={control} name="qualifications" render={({ field }) => (
            <FormItem><FormLabel>Qualifications</FormLabel><FormControl><Textarea placeholder="e.g., B.Ed, M.Sc. in Physics" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        <FormField control={control} name="experience" render={({ field }) => (
            <FormItem><FormLabel>Years of Experience</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
         <FormField
            control={control}
            name="cv"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Upload CV</FormLabel>
                <FormControl>
                  <Input type="file" onChange={(e) => field.onChange(e.target.files)} accept={ACCEPTED_FILE_TYPES.join(",")} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
        <AlertTitle className="text-primary text-xl">Application Sent!</AlertTitle>
        <AlertDescription className="space-y-4">
            Thank you for applying for a teaching post at HCSSS. We have received your application and will review it. If your profile is shortlisted, we will contact you to schedule an interview.
        </AlertDescription>
    </Alert>
  );

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
       <div className="w-full max-w-2xl space-y-6">
         <div className="text-center">
            <Image src={settings.logoUrl || "https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png"} alt="School Logo" width={80} height={80} className="mb-4 rounded-full mx-auto" />
            <h1 className="text-2xl font-bold text-primary">HCSSS</h1>
            <p className="text-muted-foreground">
                Fill out the form below to apply for a teaching post.
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
