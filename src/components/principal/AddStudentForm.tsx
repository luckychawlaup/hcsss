

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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Loader2, AlertCircle, CheckCircle, Copy, UserPlus, CalendarIcon, Plus, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Separator } from "../ui/separator";
import { addStudent } from "@/lib/supabase/students";
import { createClient } from "@/lib/supabase/client";


const classes = ["Nursery", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const sections = ["A", "B"];
const defaultSeniorSubjects = ["Physics", "Chemistry", "Maths", "Biology", "Computer Science", "English", "Commerce", "Accounts", "Economics"];

const addStudentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  photo: z.instanceof(FileList).optional(),
  father_name: z.string().min(2, "Father's name is required."),
  mother_name: z.string().min(2, "Mother's name is required."),
  address: z.string().min(10, "Address is too short."),
  class: z.string({ required_error: "Please select a class."}),
  section: z.string({ required_error: "Please select a section."}),
  admission_date: z.string().min(1, "Admission date is required."),
  date_of_birth: z.string().min(1, "Date of birth is required."),
  aadharCard: z.instanceof(FileList).optional(),
  aadhar_number: z.string().optional(),
  opted_subjects: z.array(z.string()).optional(),
  father_phone: z.string().optional(),
  mother_phone: z.string().optional(),
  student_phone: z.string().optional(),
}).refine(data => !!data.father_phone || !!data.mother_phone || !!data.student_phone, {
  message: "At least one phone number (Father's, Mother's, or Student's) must be provided.",
  path: ["father_phone"],
});


interface AddStudentFormProps {
    onStudentAdded: () => void;
}

export default function AddStudentForm({ onStudentAdded }: AddStudentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ name: string, email: string } | null>(null);
  const [customSubject, setCustomSubject] = useState("");
  const [seniorSubjects, setSeniorSubjects] = useState(defaultSeniorSubjects);
  const { toast } = useToast();
  const supabase = createClient();

  const form = useForm<z.infer<typeof addStudentSchema>>({
    resolver: zodResolver(addStudentSchema),
    defaultValues: {
      name: "",
      email: "",
      father_name: "",
      mother_name: "",
      address: "",
      class: "",
      section: "",
      admission_date: formatDate(new Date(), "dd/MM/yyyy"),
      date_of_birth: "",
      opted_subjects: [],
      aadhar_number: "",
      father_phone: "",
      mother_phone: "",
      student_phone: "",
    },
  });

  const selectedClass = form.watch("class");
  const optedSubjects = form.watch("opted_subjects") || [];

  const handleAddCustomSubject = () => {
    if (customSubject.trim() && !seniorSubjects.includes(customSubject.trim())) {
        const newSubject = customSubject.trim();
        setSeniorSubjects(prev => [...prev, newSubject]);
        form.setValue("opted_subjects", [...optedSubjects, newSubject]);
        setCustomSubject("");
    }
  }


  async function onSubmit(values: z.infer<typeof addStudentSchema>) {
    setIsLoading(true);
    setError(null);
    setSuccessInfo(null);
    
    let tempAuthUser = null;
    const tempPassword = Math.random().toString(36).slice(-8); 

    try {
        // Step 1: Create the Supabase Auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: values.email,
            password: tempPassword,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("User creation failed.");
        
        tempAuthUser = authData.user;

        // Step 2: Prepare the student data payload including files
        const studentDataPayload = {
            ...values,
            photo: values.photo?.[0],
            aadharCard: values.aadharCard?.[0],
        };

        // Step 3: Save the student data to the database (which also handles uploads)
        await addStudent(tempAuthUser.id, studentDataPayload as any);

        // If all successful:
        setSuccessInfo({ name: values.name, email: values.email });
        toast({
            title: "Student Admitted Successfully!",
            description: `${values.name}'s account has been created. An email has been sent to them to verify their account and set a password.`,
        });
        form.reset();

    } catch (e: any) {
        // CRITICAL: If any step after auth creation fails, a server-side function would be needed to delete the temporary auth user for a robust implementation.
        if (tempAuthUser) {
            console.warn("An error occurred after user creation. Manual auth user cleanup may be required for:", tempAuthUser.id);
        }
        
        let errorMessage = `An unexpected error occurred: ${e.message}`;
        if (e.message.includes('User already registered')) {
            errorMessage = "This email is already in use by another account. Please use a different email.";
        }
        setError(errorMessage);
        console.error("Error adding student: ", e);

    } finally {
        setIsLoading(false);
    }
  }


  const handleAddAnother = () => {
    setSuccessInfo(null);
  }

  if (successInfo) {
    return (
        <Alert variant="default" className="bg-primary/10 border-primary/20 mt-6">
            <CheckCircle className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">Student Admitted!</AlertTitle>
            <AlertDescription className="space-y-4">
                <p><strong>{successInfo.name}</strong> has been admitted with the email <strong>{successInfo.email}</strong>.</p>
                <p>An email verification has been sent. They must use the link in their email to verify their account and can then log in.</p>
                 <div className="flex gap-2 pt-2">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
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
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                        <Input type="email" placeholder="student@example.com" {...field} />
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
                        <FormLabel>Student Photo (Optional)</FormLabel>
                        <FormControl>
                          <Input type="file" accept="image/*" {...form.register('photo')} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
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
                    control={form.control}
                    name="admission_date"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Admission Date</FormLabel>
                        <FormControl>
                            <Input placeholder="DD/MM/YYYY" {...field} />
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
                 <FormField
                    control={form.control}
                    name="father_name"
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
                    name="mother_name"
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
                
                 <FormField
                    control={form.control}
                    name="father_phone"
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
                    name="mother_phone"
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
                    name="student_phone"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Student's Phone (Optional)</FormLabel>
                        <FormControl>
                        <Input placeholder="+91..." {...field} />
                        </FormControl>
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
                        <Input placeholder="xxxx-xxxx-xxxx" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="aadharCard"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Aadhar Card (Optional)</FormLabel>
                        <FormControl>
                          <Input type="file" accept="image/*,application/pdf" {...form.register('aadharCard')} />
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
                        <Textarea placeholder="Enter full residential address" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>

            {(selectedClass === "11th" || selectedClass === "12th") && (
                <>
                <Separator/>
                <FormField
                    control={form.control}
                    name="opted_subjects"
                    render={() => (
                        <FormItem>
                            <div className="mb-4">
                                <FormLabel className="text-base">Opted Subjects for Class {selectedClass}</FormLabel>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {seniorSubjects.map((subject) => (
                                    <FormField
                                        key={subject}
                                        control={form.control}
                                        name="opted_subjects"
                                        render={({ field }) => {
                                            return (
                                            <FormItem key={subject} className="flex flex-row items-start space-x-3 space-y-0">
                                                <FormControl>
                                                <Checkbox
                                                    checked={field.value?.includes(subject)}
                                                    onCheckedChange={(checked) => {
                                                    return checked
                                                        ? field.onChange([...(field.value || []), subject])
                                                        : field.onChange(
                                                            field.value?.filter(
                                                                (value) => value !== subject
                                                            )
                                                            )
                                                    }}
                                                />
                                                </FormControl>
                                                <FormLabel className="font-normal">{subject}</FormLabel>
                                            </FormItem>
                                            )
                                        }}
                                    />
                                ))}
                            </div>
                            <div className="flex gap-2 mt-4">
                                <Input 
                                    placeholder="Add custom subject"
                                    value={customSubject}
                                    onChange={(e) => setCustomSubject(e.target.value)}
                                />
                                <Button type="button" onClick={handleAddCustomSubject}>
                                    <Plus className="mr-2" /> Add
                                </Button>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                </>
            )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Admit Student & Create Account
          </Button>
        </form>
      </Form>
    </>
  );
}
