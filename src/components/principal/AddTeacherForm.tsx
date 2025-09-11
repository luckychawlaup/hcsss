
"use client"

import { useState, useEffect } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Loader2, CalendarIcon, AlertCircle, CheckCircle, Copy, UserPlus, KeyRound, Plus, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "../ui/textarea";
import type { Teacher } from "@/lib/firebase/teachers";
import { addTeacherWithAuth, getTeachers } from "@/lib/firebase/teachers";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";


const classes = ["Nursery", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const sections = ["A", "B"];
const allClassSections = classes.flatMap(c => sections.map(s => `${c}-${s}`));


const addTeacherSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  dob: z.date({ required_error: "Date of birth is required." }),
  fatherName: z.string().min(2, "Father's name is required."),
  motherName: z.string().min(2, "Mother's name is required."),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format."),
  address: z.string().min(10, "Address is too short."),
  role: z.enum(["classTeacher", "subjectTeacher"], { required_error: "You must select a role."}),
  subject: z.string().min(2, "Subject is required."),
  qualifications: z.array(z.string()).optional().default([]),
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
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [addedTeacherData, setAddedTeacherData] = useState<Omit<Teacher, 'id' | 'authUid' | 'joiningDate' | 'tempPassword'> | null>(null);
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [qualificationInput, setQualificationInput] = useState("");
  const { toast } = useToast();

  useEffect(() => {
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
      email: "",
      fatherName: "",
      motherName: "",
      phoneNumber: "",
      address: "",
      subject: "",
      qualifications: [],
      classTeacherOf: "",
      classesTaught: [],
    },
  });
  
  const role = form.watch("role");
  const qualifications = form.watch("qualifications", []);

  const handleAddQualification = () => {
    if (qualificationInput.trim()) {
        form.setValue("qualifications", [...qualifications, qualificationInput.trim()]);
        setQualificationInput("");
    }
  }

  const handleRemoveQualification = (index: number) => {
    const newQualifications = [...qualifications];
    newQualifications.splice(index, 1);
    form.setValue("qualifications", newQualifications);
  }

  async function onSubmit(values: z.infer<typeof addTeacherSchema>) {
    setIsLoading(true);
    setError(null);
    setGeneratedId(null);
    setAddedTeacherData(null);
    setTempPassword(null);

    try {
      const { teacherId, tempPassword: newTempPassword } = await addTeacherWithAuth(values);
      
      setGeneratedId(teacherId);
      setAddedTeacherData(values);
      setTempPassword(newTempPassword);
      toast({
        title: "Teacher Added Successfully!",
        description: `${values.name} has been added and their account has been created.`,
      });
      form.reset();
      // Do not call onTeacherAdded() here to prevent premature tab switching.
      // The user can choose to add another or view the list.
    } catch (e: any) {
      setError(`An unexpected error occurred: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `Teacher ${type} copied to clipboard.`,
    });
  };

  const handleAddAnother = () => {
    setGeneratedId(null);
    setAddedTeacherData(null);
    setTempPassword(null);
  }

  if (generatedId && addedTeacherData && tempPassword) {
    return (
        <Alert variant="default" className="bg-primary/10 border-primary/20">
            <CheckCircle className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">Teacher Added & Account Created!</AlertTitle>
            <AlertDescription className="space-y-4">
                <p>An account for {addedTeacherData.name} has been created. Please share these credentials with them securely.</p>
                
                <div className="space-y-2">
                     <div className="flex items-center justify-between rounded-md border border-primary/20 bg-background p-3">
                        <div>
                            <p className="text-xs text-muted-foreground">Teacher ID (Auth UID)</p>
                            <p className="font-mono font-semibold text-primary break-all">{generatedId}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(generatedId, "ID")}>
                            <Copy className="h-5 w-5 text-primary" />
                        </Button>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-primary/20 bg-background p-3">
                        <div>
                            <p className="text-xs text-muted-foreground">Email / Username</p>
                            <p className="font-mono font-semibold text-primary">{addedTeacherData.email}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(addedTeacherData.email, "Email")}>
                            <Copy className="h-5 w-5 text-primary" />
                        </Button>
                    </div>
                     <div className="flex items-center justify-between rounded-md border border-primary/20 bg-background p-3">
                         <div>
                            <p className="text-xs text-muted-foreground">Temporary Password</p>
                            <p className="font-mono font-semibold text-primary">{tempPassword}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(tempPassword, "Password")}>
                            <KeyRound className="h-5 w-5 text-primary" />
                        </Button>
                    </div>
                </div>

                <p className="text-xs text-muted-foreground">
                    The teacher will be required to change this temporary password upon their first login for security reasons.
                </p>

                 <div className="flex gap-2 pt-2">
                    <Button onClick={handleAddAnother}>
                        <UserPlus className="mr-2" />
                        Add Another Teacher
                    </Button>
                    <Button variant="outline" onClick={onTeacherAdded}>View Teacher List</Button>
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
                    name="email"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                        <Input placeholder="teacher@example.com" {...field} />
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
                    name="address"
                    render={({ field }) => (
                    <FormItem className="md:col-span-2">
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
            
            <div className="space-y-4">
                <FormLabel>Qualifications</FormLabel>
                <div className="flex gap-2">
                    <Input 
                        value={qualificationInput}
                        onChange={(e) => setQualificationInput(e.target.value)}
                        placeholder="e.g., B.Ed, M.Sc. in Physics"
                    />
                    <Button type="button" onClick={handleAddQualification}>
                        <Plus className="mr-2 h-4 w-4" /> Add
                    </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {qualifications.map((q, index) => (
                        <Badge key={index} variant="secondary">
                            {q}
                            <button type="button" onClick={() => handleRemoveQualification(index)} className="ml-2 rounded-full p-0.5 hover:bg-destructive/20">
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
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
            Add Teacher & Generate Credentials
          </Button>
        </form>
      </Form>
    </>
  );
}
