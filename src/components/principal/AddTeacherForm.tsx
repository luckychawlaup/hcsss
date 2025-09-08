"use client"

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
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
import { Loader2, CalendarIcon, AlertCircle, CheckCircle, Copy } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "../ui/textarea";

const addTeacherSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  dob: z.date({ required_error: "Date of birth is required." }),
  fatherName: z.string().min(2, "Father's name is required."),
  motherName: z.string().min(2, "Mother's name is required."),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format."),
  address: z.string().min(10, "Address is too short."),
  subject: z.string().min(2, "Subject is required."),
  classTaught: z.string().min(1, "Class taught is required."),
  classTeacherOf: z.string().optional(),
});

export function AddTeacherForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof addTeacherSchema>>({
    resolver: zodResolver(addTeacherSchema),
    defaultValues: {
      name: "",
      fatherName: "",
      motherName: "",
      phoneNumber: "",
      address: "",
      subject: "",
      classTaught: "",
      classTeacherOf: "",
    },
  });

  const generateTeacherId = () => {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  };

  async function onSubmit(values: z.infer<typeof addTeacherSchema>) {
    setIsLoading(true);
    setError(null);
    setGeneratedId(null);

    try {
      // In a real app, you'd save this to a database.
      // Here, we'll just simulate it.
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const teacherId = generateTeacherId();
      console.log("New Teacher Data:", { ...values, teacherId });
      
      setGeneratedId(teacherId);
      toast({
        title: "Teacher Added Successfully!",
        description: `${values.name} has been added to the system.`,
      });
      form.reset();
    } catch (e: any) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const copyToClipboard = () => {
    if (generatedId) {
      navigator.clipboard.writeText(generatedId);
      toast({
        title: "Copied!",
        description: "Teacher ID copied to clipboard.",
      });
    }
  };

  if (generatedId) {
    return (
        <Alert variant="default" className="bg-primary/10 border-primary/20">
            <CheckCircle className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">Teacher Added!</AlertTitle>
            <AlertDescription className="space-y-4">
                <p>The teacher has been successfully registered. Please provide them with their unique Teacher ID to complete the signup process.</p>
                <div className="flex items-center justify-between rounded-md border border-primary/20 bg-background p-3">
                    <p className="font-mono text-lg font-bold text-primary">{generatedId}</p>
                    <Button variant="ghost" size="icon" onClick={copyToClipboard}>
                        <Copy className="h-5 w-5 text-primary" />
                    </Button>
                </div>
                 <Button onClick={() => setGeneratedId(null)}>Add Another Teacher</Button>
            </AlertDescription>
        </Alert>
    )
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
                        <Input placeholder="e.g., Sunita Sharma" {...field} />
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
                                format(field.value, "PPP")
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
                    name="fatherName"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Father's Name</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., Ramesh Sharma" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="motherName"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Mother's Name</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., Anita Sharma" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="phoneNumber"
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
                    <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                        <Textarea placeholder="Enter full address" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Primary Subject Taught</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., Mathematics" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="classTaught"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Classes Taught</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., 9th, 10th" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="classTeacherOf"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Class Teacher of (Optional)</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., 10-B" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Teacher & Generate ID
          </Button>
        </form>
      </Form>
    </>
  );
}
