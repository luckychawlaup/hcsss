
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, CheckCircle, Copy, UserPlus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "../ui/textarea";
import type { Student } from "@/lib/firebase/students";
import { addStudent } from "@/lib/firebase/students";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const classes = ["Nursery", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const sections = ["A", "B", "C", "D"];

const addStudentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  fatherName: z.string().min(2, "Father's name is required."),
  motherName: z.string().min(2, "Mother's name is required."),
  address: z.string().min(10, "Address is too short."),
  class: z.string({ required_error: "Please select a class."}),
  section: z.string({ required_error: "Please select a section."}),
  fatherPhone: z.string().optional(),
  motherPhone: z.string().optional(),
  studentPhone: z.string().optional(),
}).refine(data => !!data.fatherPhone || !!data.motherPhone || !!data.studentPhone, {
  message: "At least one phone number must be provided.",
  path: ["fatherPhone"],
});

interface AddStudentFormProps {
    onStudentAdded: () => void;
}

export function AddStudentForm({ onStudentAdded }: AddStudentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedSrn, setGeneratedSrn] = useState<string | null>(null);
  const [addedStudentName, setAddedStudentName] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof addStudentSchema>>({
    resolver: zodResolver(addStudentSchema),
    defaultValues: {
      name: "",
      fatherName: "",
      motherName: "",
      address: "",
      class: "",
      section: "",
      fatherPhone: "",
      motherPhone: "",
      studentPhone: "",
    },
  });

  const generateSrn = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  async function onSubmit(values: z.infer<typeof addStudentSchema>) {
    setIsLoading(true);
    setError(null);
    setGeneratedSrn(null);
    setAddedStudentName(null);

    try {
      const srn = generateSrn();
      const admissionDate = Date.now();
      
      const newStudentData: Omit<Student, 'id' | 'srn'> = {
        ...values,
        admissionDate,
      };

      await addStudent(srn, newStudentData);
      
      setGeneratedSrn(srn);
      setAddedStudentName(values.name);
      toast({
        title: "Student Added Successfully!",
        description: `${values.name} has been admitted.`,
      });
      form.reset();
      onStudentAdded();
    } catch (e: any) {
      setError(`An unexpected error occurred: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  const copyToClipboard = () => {
    if (generatedSrn) {
      navigator.clipboard.writeText(generatedSrn);
      toast({
        title: "Copied!",
        description: "Student SRN copied to clipboard.",
      });
    }
  };

  const handleAddAnother = () => {
    setGeneratedSrn(null);
    setAddedStudentName(null);
  }

  if (generatedSrn && addedStudentName) {
    return (
        <Alert variant="default" className="bg-primary/10 border-primary/20 mt-6">
            <CheckCircle className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">Student Admitted!</AlertTitle>
            <AlertDescription className="space-y-4">
                <p>{addedStudentName} has been successfully registered. Please provide the family with their unique Student Registration Number (SRN).</p>
                <div className="flex items-center justify-between rounded-md border border-primary/20 bg-background p-3">
                    <p className="font-mono text-lg font-bold text-primary">{generatedSrn}</p>
                    <Button variant="ghost" size="icon" onClick={copyToClipboard}>
                        <Copy className="h-5 w-5 text-primary" />
                    </Button>
                </div>
                 <div className="flex gap-2">
                    <Button onClick={handleAddAnother}>
                        <UserPlus className="mr-2" />
                        Admit Another Student
                    </Button>
                    <Button variant="outline" onClick={onStudentAdded}>View Student List</Button>
                 </div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem className="md:col-span-3">
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., Rohan Kumar" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="class"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Class</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="section"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Section</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select section" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <div></div>
                 <FormField
                    control={form.control}
                    name="fatherName"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Father's Name</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., Anil Kumar" {...field} />
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
                        <Input placeholder="e.g., Sunita Kumar" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <div></div>
                 <FormField
                    control={form.control}
                    name="fatherPhone"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Father's Phone</FormLabel>
                        <FormControl>
                        <Input placeholder="+91..." {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="motherPhone"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Mother's Phone</FormLabel>
                        <FormControl>
                        <Input placeholder="+91..." {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="studentPhone"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Student's Phone</FormLabel>
                        <FormControl>
                        <Input placeholder="+91..." {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                    <FormItem className="md:col-span-3">
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                        <Textarea placeholder="Enter full residential address" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Admit Student & Generate SRN
          </Button>
        </form>
      </Form>
    </>
  );
}
