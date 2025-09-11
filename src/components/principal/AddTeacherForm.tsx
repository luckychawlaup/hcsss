
"use client"

import { useState, useEffect } from "react";
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
import { Loader2, CalendarIcon, AlertCircle, CheckCircle, Copy, Printer } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "../ui/textarea";
import type { Teacher } from "./PrincipalDashboard";
import { addTeacher, getTeachers } from "@/lib/firebase/teachers";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "../ui/checkbox";


const classes = ["Nursery", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const sections = ["A", "B"];
const allClassSections = classes.flatMap(c => sections.map(s => `${c}-${s}`));


const addTeacherSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  dob: z.date({ required_error: "Date of birth is required." }),
  fatherName: z.string().min(2, "Father's name is required."),
  motherName: z.string().min(2, "Mother's name is required."),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format."),
  address: z.string().min(10, "Address is too short."),
  role: z.enum(["classTeacher", "subjectTeacher"], { required_error: "You must select a role."}),
  subject: z.string().min(2, "Subject is required."),
  classTeacherOf: z.string().optional(),
  classesTaught: z.array(z.string()).optional().default([]),
}).refine(data => {
    if (data.role === 'classTeacher') return !!data.classTeacherOf;
    return true;
}, {
    message: "Please select a class for the Class Teacher.",
    path: ["classTeacherOf"],
}).refine(data => {
    if (data.role === 'subjectTeacher') return data.classesTaught && data.classesTaught.length > 0;
    return true;
}, {
    message: "Please select at least one class.",
    path: ["classesTaught"],
});


interface AddTeacherFormProps {
    onTeacherAdded: () => void;
}

export function AddTeacherForm({ onTeacherAdded }: AddTeacherFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [addedTeacherData, setAddedTeacherData] = useState<Omit<Teacher, 'id'> | null>(null);
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch all teachers to check for existing class teacher assignments
    const unsubscribe = getTeachers((teachers) => {
        const assigned = teachers
            .filter(t => t.role === 'classTeacher' && t.classTeacherOf)
            .map(t => t.classTeacherOf as string);
        setAssignedClasses(assigned);
    });

    return () => unsubscribe();
  }, []);

  const form = useForm<z.infer<typeof addTeacherSchema>>({
    resolver: zodResolver(addTeacherSchema),
    defaultValues: {
      name: "",
      fatherName: "",
      motherName: "",
      phoneNumber: "",
      address: "",
      subject: "",
      classTeacherOf: "",
      classesTaught: [],
    },
  });
  
  const role = form.watch("role");

  const generateTeacherId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  async function onSubmit(values: z.infer<typeof addTeacherSchema>) {
    setIsLoading(true);
    setError(null);
    setGeneratedId(null);
    setAddedTeacherData(null);

    try {
      const teacherId = generateTeacherId();
      
      const newTeacherData: Omit<Teacher, 'id'> = {
        ...values,
        dob: format(values.dob, "yyyy-MM-dd"), // Store DOB in a consistent format
      };

      await addTeacher(teacherId, newTeacherData);
      
      setGeneratedId(teacherId);
      setAddedTeacherData(newTeacherData);
      toast({
        title: "Teacher Added Successfully!",
        description: `${values.name} has been added to the system.`,
      });
      onTeacherAdded();
      form.reset();
    } catch (e: any) {
      setError(`An unexpected error occurred: ${e.message}`);
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

  const handlePrintLetter = () => {
    if (!addedTeacherData || !generatedId) return;

    const printWindow = window.open('', '_blank');
    printWindow?.document.write(`
        <html>
            <head>
                <title>Joining Letter</title>
                <style>
                    body { font-family: 'Poppins', sans-serif; line-height: 1.6; color: #333; margin: 40px; }
                    .container { max-width: 800px; margin: auto; }
                    .header { display: flex; align-items: center; border-bottom: 2px solid #4285F4; padding-bottom: 20px; margin-bottom: 30px; }
                    .header img { width: 80px; height: 80px; margin-right: 20px; }
                    .header h1 { font-size: 28px; color: #4285F4; margin: 0; }
                    .header p { margin: 0; font-size: 14px; }
                    .content { font-size: 16px; }
                    .content p { margin: 15px 0; }
                    .footer { text-align: right; margin-top: 50px; font-style: italic; }
                    .details { border-collapse: collapse; width: 100%; margin: 25px 0; }
                    .details td { padding: 8px; border: 1px solid #ddd; }
                    .details td:first-child { font-weight: bold; width: 30%; }
                </style>
                 <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet">
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <img src="https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hiltonconventschool_logo.png" alt="School Logo" />
                        <div>
                            <h1>Hilton Convent School</h1>
                            <p>Joya Road, Amroha, 244221, Uttar Pradesh</p>
                        </div>
                    </div>
                    <div class="content">
                        <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB')}</p>
                        
                        <h3>Subject: Appointment Letter</h3>
                        
                        <p>Dear ${addedTeacherData.name},</p>
                        
                        <p>We are pleased to offer you the position at Hilton Convent School. We were impressed with your qualifications and experience and believe you will be a valuable asset to our team.</p>
                        
                        <p>Please find your details below:</p>
                        
                        <table class="details">
                            <tr><td>Teacher ID</td><td>${generatedId}</td></tr>
                            <tr><td>Full Name</td><td>${addedTeacherData.name}</td></tr>
                             <tr><td>Role</td><td>${addedTeacherData.role === 'classTeacher' ? 'Class Teacher' : 'Subject Teacher'}</td></tr>
                            ${addedTeacherData.role === 'classTeacher' ? `<tr><td>Assigned Class</td><td>${addedTeacherData.classTeacherOf}</td></tr>` : ''}
                            ${addedTeacherData.role === 'subjectTeacher' ? `<tr><td>Classes Taught</td><td>${addedTeacherData.classesTaught?.join(', ')}</td></tr>` : ''}
                            <tr><td>Primary Subject</td><td>${addedTeacherData.subject}</td></tr>
                        </table>

                        <p>Please use the Teacher ID provided above to complete your registration on the school portal.</p>
                        
                        <p>We look forward to you joining our team.</p>
                        
                        <div class="footer">
                            <p>Sincerely,</p>
                            <p><strong>The Principal</strong><br/>Hilton Convent School</p>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    `);
    printWindow?.document.close();
    printWindow?.focus();
    // Use timeout to ensure content is loaded before printing
    setTimeout(() => {
        printWindow?.print();
    }, 500);
  }

  const handleAddAnother = () => {
    setGeneratedId(null);
    setAddedTeacherData(null);
  }

  if (generatedId && addedTeacherData) {
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
                 <div className="flex gap-2">
                    <Button onClick={handleAddAnother}>Add Another Teacher</Button>
                    <Button variant="outline" onClick={handlePrintLetter}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print Joining Letter
                    </Button>
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
            </div>

            <Separator />
            
             <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Primary Subject</FormLabel>
                            <FormControl>
                            <Input placeholder="e.g., Mathematics" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel>Select Role</FormLabel>
                            <FormControl>
                                <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex items-center space-x-4 pt-2"
                                >
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="classTeacher" />
                                        </FormControl>
                                        <FormLabel className="font-normal">Class Teacher</FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="subjectTeacher" />
                                        </FormControl>
                                        <FormLabel className="font-normal">Subject Teacher</FormLabel>
                                    </FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>

                {role === "classTeacher" && (
                        <FormField
                            control={form.control}
                            name="classTeacherOf"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Class Teacher Of</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an available class" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {allClassSections.map(cs => (
                                            <SelectItem 
                                                key={cs} 
                                                value={cs}
                                                disabled={assignedClasses.includes(cs)}
                                            >
                                                {cs} {assignedClasses.includes(cs) && "(Assigned)"}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                    )}

                    {role === "subjectTeacher" && (
                        <FormField
                            control={form.control}
                            name="classesTaught"
                            render={() => (
                                <FormItem>
                                    <div className="mb-4">
                                        <FormLabel className="text-base">Classes Taught</FormLabel>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                        {allClassSections.map((item) => (
                                            <FormField
                                                key={item}
                                                control={form.control}
                                                name="classesTaught"
                                                render={({ field }) => {
                                                    return (
                                                    <FormItem
                                                        key={item}
                                                        className="flex flex-row items-start space-x-3 space-y-0"
                                                    >
                                                        <FormControl>
                                                        <Checkbox
                                                            checked={field.value?.includes(item)}
                                                            onCheckedChange={(checked) => {
                                                            return checked
                                                                ? field.onChange([...(field.value || []), item])
                                                                : field.onChange(
                                                                    field.value?.filter(
                                                                        (value) => value !== item
                                                                    )
                                                                    )
                                                            }}
                                                        />
                                                        </FormControl>
                                                        <FormLabel className="font-normal">
                                                        {item}
                                                        </FormLabel>
                                                    </FormItem>
                                                    )
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
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
