
"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Loader2, CalendarIcon, AlertCircle, PlusCircle, Trash2, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "../ui/textarea";
import { addStudent } from "@/lib/supabase/students";
import { Separator } from "../ui/separator";

const classes = ["Nursery", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const sections = ["A", "B", "C", "D"];

const addStudentSchema = z.object({
    name: z.string().min(2, "Student name is required."),
    email: z.string().email("A valid email is required for the student's account."),
    father_name: z.string().min(2, "Father's name is required."),
    mother_name: z.string().min(2, "Mother's name is required."),
    date_of_birth: z.string().regex(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/, "Date must be in DD/MM/YYYY format."),
    admission_date: z.date({ required_error: "Admission date is required."}),
    address: z.string().min(10, "A valid address is required."),
    class: z.string({ required_error: "Class is required."}),
    section: z.string({ required_error: "Section is required."}),
    father_phone: z.string().optional(),
    mother_phone: z.string().optional(),
    student_phone: z.string().optional(),
    opted_subjects: z.array(z.string()).optional(),
    photo_url: z.string().url("Please enter a valid URL or leave it empty.").optional().or(z.literal('')),
    aadhar_number: z.string().length(12, "Aadhar number must be 12 digits.").optional().or(z.literal('')),
    aadhar_url: z.string().url("Please enter a valid URL or leave it empty.").optional().or(z.literal('')),
}).refine(data => data.father_phone || data.mother_phone, {
    message: "At least one parent's phone number is required.",
    path: ["father_phone"],
});


interface AddStudentFormProps {
    onStudentAdded: () => void;
}

export default function AddStudentForm({ onStudentAdded }: AddStudentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subjectInput, setSubjectInput] = useState("");
  const { toast } = useToast();

  const form = useForm<z.infer<typeof addStudentSchema>>({
    resolver: zodResolver(addStudentSchema),
    defaultValues: {
      name: "",
      email: "",
      father_name: "",
      mother_name: "",
      address: "",
      date_of_birth: "",
      opted_subjects: [],
      photo_url: "",
    },
  });

  const { control, handleSubmit, reset, watch, setValue } = form;
  const optedSubjects = watch("opted_subjects", []);

  const handleAddSubject = () => {
      if(subjectInput.trim()) {
          setValue("opted_subjects", [...(optedSubjects || []), subjectInput.trim()]);
          setSubjectInput("");
      }
  }

  const handleRemoveSubject = (index: number) => {
    if (optedSubjects) {
      const newSubjects = [...optedSubjects];
      newSubjects.splice(index, 1);
      setValue("opted_subjects", newSubjects);
    }
  }

  async function onSubmit(values: z.infer<typeof addStudentSchema>) {
    setIsLoading(true);
    setError(null);
    try {
        await addStudent({
            ...values,
            photo_url: values.photo_url || undefined,
            aadhar_url: values.aadhar_url || undefined,
            aadhar_number: values.aadhar_number || undefined,
        });
        toast({
            title: "Student Added Successfully!",
            description: `${values.name} has been admitted to Class ${values.class}-${values.section}.`,
        });
        reset();
        onStudentAdded();
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Rohan Kumar" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student's Login Email</FormLabel>
                  <FormControl>
                    <Input placeholder="student.email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={control}
              name="father_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Father's Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={control}
              name="mother_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mother's Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="date_of_birth"
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
                control={control}
                name="admission_date"
                render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Admission Date</FormLabel>
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
                        initialFocus
                        />
                    </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
                )}
            />
             <FormField
              control={control}
              name="father_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Father's Phone</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={control}
              name="mother_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mother's Phone</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={control}
              name="student_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student's Phone (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={control}
                name="class"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Class</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
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
                control={control}
                name="section"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Section</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
          </div>
            <Separator/>
            <p className="font-semibold text-foreground">Subjects & Documents</p>
             <div className="space-y-4">
                <FormItem>
                    <FormLabel>Opted Subjects (for senior classes)</FormLabel>
                    <div className="flex gap-2">
                        <Input value={subjectInput} onChange={(e) => setSubjectInput(e.target.value)} placeholder="e.g., Physics" />
                        <Button type="button" variant="outline" onClick={handleAddSubject}><PlusCircle/></Button>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                        {optedSubjects?.map((q, i) => (
                            <div key={i} className="flex items-center gap-2 bg-secondary rounded-full pl-3 pr-1 py-1 text-sm">
                                {q}
                                <button type="button" onClick={() => handleRemoveSubject(i)} className="rounded-full bg-secondary-foreground/10 text-secondary-foreground hover:bg-secondary-foreground/20 h-5 w-5 flex items-center justify-center">
                                    <X className="h-3 w-3"/>
                                </button>
                            </div>
                        ))}
                    </div>
                </FormItem>
                 <FormField
                    control={control}
                    name="photo_url"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Student Photo URL (Optional)</FormLabel>
                        <FormControl>
                            <Input placeholder="https://example.com/photo.jpg" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={control}
                    name="aadhar_number"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Aadhar Number (Optional)</FormLabel>
                        <FormControl>
                            <Input {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={control}
                    name="aadhar_url"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Aadhar Card Scan URL (Optional)</FormLabel>
                        <FormControl>
                            <Input placeholder="https://example.com/aadhar.jpg" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Admit Student
          </Button>
        </form>
      </Form>
    </>
  );
}
