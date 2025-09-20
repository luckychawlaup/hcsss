

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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Loader2, AlertCircle, CheckCircle, Copy, UserPlus, CalendarIcon, Plus, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { registerStudentDetails } from "@/lib/firebase/students";
import type { StudentRegistrationData } from "@/lib/firebase/students";
import { Separator } from "../ui/separator";
import { uploadImage } from "@/lib/imagekit";

const classes = ["Nursery", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const sections = ["A", "B"];
const defaultSeniorSubjects = ["Physics", "Chemistry", "Maths", "Biology", "Computer Science", "English", "Commerce", "Accounts", "Economics"];

const addStudentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  photo: z.instanceof(FileList).optional(),
  fatherName: z.string().min(2, "Father's name is required."),
  motherName: z.string().min(2, "Mother's name is required."),
  address: z.string().min(10, "Address is too short."),
  class: z.string({ required_error: "Please select a class."}),
  section: z.string({ required_error: "Please select a section."}),
  admissionDate: z.date({ required_error: "Admission date is required." }),
  dateOfBirth: z.date({ required_error: "Date of birth is required." }),
  aadharCard: z.instanceof(FileList).optional(),
  aadharNumber: z.string().optional(),
  optedSubjects: z.array(z.string()).optional(),
  fatherPhone: z.string().optional(),
  motherPhone: z.string().optional(),
  studentPhone: z.string().optional(),
}).refine(data => !!data.fatherPhone || !!data.motherPhone || !!data.studentPhone, {
  message: "At least one phone number (Father's, Mother's, or Student's) must be provided.",
  path: ["fatherPhone"],
});


interface AddStudentFormProps {
    onStudentAdded: () => void;
}

export default function AddStudentForm({ onStudentAdded }: AddStudentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationInfo, setRegistrationInfo] = useState<{ key: string; name: string } | null>(null);
  const [customSubject, setCustomSubject] = useState("");
  const [seniorSubjects, setSeniorSubjects] = useState(defaultSeniorSubjects);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof addStudentSchema>>({
    resolver: zodResolver(addStudentSchema),
    defaultValues: {
      name: "",
      email: "",
      fatherName: "",
      motherName: "",
      address: "",
      class: "",
      section: "",
      admissionDate: new Date(),
      optedSubjects: [],
      aadharNumber: "",
      fatherPhone: "",
      motherPhone: "",
      studentPhone: "",
    },
  });

  const selectedClass = form.watch("class");
  const optedSubjects = form.watch("optedSubjects") || [];

  const handleAddCustomSubject = () => {
    if (customSubject.trim() && !seniorSubjects.includes(customSubject.trim())) {
        const newSubject = customSubject.trim();
        setSeniorSubjects(prev => [...prev, newSubject]);
        form.setValue("optedSubjects", [...optedSubjects, newSubject]);
        setCustomSubject("");
    }
  }


  async function onSubmit(values: z.infer<typeof addStudentSchema>) {
    setIsLoading(true);
    setError(null);
    setRegistrationInfo(null);

    try {
      let photoUrl: string | undefined;
      const studentPhotoFile = values.photo?.[0];
      if (studentPhotoFile) {
        photoUrl = await uploadImage(studentPhotoFile, "Photos (students)");
      }
      
      let aadharUrl: string | undefined;
      const aadharFile = values.aadharCard?.[0];
      if (aadharFile) {
        aadharUrl = await uploadImage(aadharFile, "Aadhar Cards");
      }
      
      const dataToSave = {
        ...values,
        aadharNumber: values.aadharNumber || "",
        studentPhone: values.studentPhone || "",
        fatherPhone: values.fatherPhone || "",
        motherPhone: values.motherPhone || "",
        photoUrl: photoUrl || "",
        aadharUrl: aadharUrl || "",
      } as StudentRegistrationData;

      const result = await registerStudentDetails(dataToSave);

      setRegistrationInfo({ key: result.registrationKey, name: values.name });
      toast({
        title: "Student Registered Successfully!",
        description: `Registration details for ${values.name} have been saved.`,
      });
      form.reset();
    } catch (e: any) {
      setError(`An unexpected error occurred: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Registration Key copied to clipboard.",
      });
  };

  const handleAddAnother = () => {
    setRegistrationInfo(null);
  }

  if (registrationInfo) {
    return (
        <Alert variant="default" className="bg-primary/10 border-primary/20 mt-6">
            <CheckCircle className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">Student Admitted!</AlertTitle>
            <AlertDescription className="space-y-4">
                <p><strong>{registrationInfo.name}</strong> has been admitted. Please provide the family with their unique one-time Registration Key to create their account.</p>
                
                 <div className="flex items-center justify-between rounded-md border border-primary/20 bg-background p-3">
                    <p className="font-mono text-lg font-bold text-primary">{registrationInfo.key}</p>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(registrationInfo.key)}>
                        <Copy className="h-5 w-5 text-primary" />
                    </Button>
                </div>
                
                <p className="text-xs text-muted-foreground">
                    The student will need this key, their registered name, and email to create their account on the student login page.
                </p>

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
                    name="dateOfBirth"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Date of Birth</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                <Button
                                    variant={"outline"}
                                    className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? formatDate(field.value, "PPP") : <span>Pick a date</span>}
                                </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1990-01-01")} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="admissionDate"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Admission Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                <Button
                                    variant={"outline"}
                                    className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? formatDate(field.value, "PPP") : <span>Pick a date</span>}
                                </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            </PopoverContent>
                        </Popover>
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
                    name="aadharNumber"
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
                    name="optedSubjects"
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
                                        name="optedSubjects"
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
            Admit Student & Generate Registration Key
          </Button>
        </form>
      </Form>
    </>
  );
}

    

    