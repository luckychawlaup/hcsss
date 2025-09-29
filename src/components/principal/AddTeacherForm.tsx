
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Loader2, CalendarIcon, AlertCircle, PlusCircle, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "../ui/textarea";
import { Separator } from "../ui/separator";
import { addTeacher } from "@/lib/supabase/teachers";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const PHOTO_FILE_TYPES = ["image/jpeg", "image/png"];

const classes = ["Nursery", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const sections = ["A", "B"];
const allClassSections = classes.flatMap(c => sections.map(s => `${c}-${s}`));


const addTeacherSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  dob: z.string().regex(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/, "Date must be in DD/MM/YYYY format."),
  father_name: z.string().min(2, "Father's name is required."),
  mother_name: z.string().min(2, "Mother's name is required."),
  phone_number: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format."),
  address: z.string().min(10, "Address is too short."),
  role: z.enum(["classTeacher", "subjectTeacher"], { required_error: "You must select a role."}),
  subject: z.string().min(2, "Subject is required."),
  qualifications: z.array(z.string()).optional().default([]),
  class_teacher_of: z.string().optional(),
  classes_taught: z.array(z.string()).optional().default([]),
  joining_date: z.date({ required_error: "Joining date is required."}),
  photo: z.any()
    .refine((files) => files?.length == 1, "Teacher photo is required.")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `Max photo size is 2MB.`)
    .refine(
      (files) => PHOTO_FILE_TYPES.includes(files?.[0]?.type),
      "Only .jpg and .png formats are supported for photos."
    ),
}).refine(data => {
    if (data.role === 'classTeacher') return !!data.class_teacher_of;
    return true;
}, {
    message: "Please select a class for the Class Teacher.",
    path: ["class_teacher_of"],
}).refine(data => {
    if (data.role === 'subjectTeacher') return data.classes_taught && data.classes_taught.length > 0;
    return true;
}, {
    message: "Please select at least one class for the Subject Teacher.",
    path: ["classes_taught"],
});


interface AddTeacherFormProps {
    onTeacherAdded: () => void;
}

export default function AddTeacherForm({ onTeacherAdded }: AddTeacherFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qualificationInput, setQualificationInput] = useState("");
  const { toast } = useToast();

  const form = useForm<z.infer<typeof addTeacherSchema>>({
    resolver: zodResolver(addTeacherSchema),
    defaultValues: {
      name: "",
      email: "",
      dob: "",
      father_name: "",
      mother_name: "",
      phone_number: "",
      address: "",
      role: undefined,
      subject: "",
      qualifications: [],
      classes_taught: [],
    },
  });

  const { control, handleSubmit, reset, watch, setValue } = form;
  const role = watch("role");
  const qualifications = watch("qualifications", []);

  const handleAddQualification = () => {
    if (qualificationInput.trim()) {
        setValue("qualifications", [...qualifications, qualificationInput.trim()]);
        setQualificationInput("");
    }
  }

  const handleRemoveQualification = (index: number) => {
    const newQualifications = [...qualifications];
    newQualifications.splice(index, 1);
    setValue("qualifications", newQualifications);
  }

  async function onSubmit(values: z.infer<typeof addTeacherSchema>) {
    setIsLoading(true);
    setError(null);
    try {
        const teacherDataForDb = {
            ...values,
            joining_date: values.joining_date.getTime(),
            photo: values.photo[0]
        };

        await addTeacher(teacherDataForDb);
      
        toast({
            title: "Teacher Added!",
            description: `An account for ${values.name} has been created and an email has been sent to set up their password.`,
        });
        reset();
        onTeacherAdded();

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
                        <Input placeholder="e.g., Jane Doe" {...field} />
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
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                        <Input placeholder="teacher@example.com" {...field} />
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
                    control={control}
                    name="joining_date"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Joining Date</FormLabel>
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
                    name="phone_number"
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
                    control={control}
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
            
            <Separator/>
            <p className="font-semibold text-foreground">Academic & Role Details</p>

             <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <FormField
                        control={control}
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
                        control={control}
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
                        control={control}
                        name="class_teacher_of"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Class Teacher Of</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a class and section" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {allClassSections.map(cs => (
                                        <SelectItem key={cs} value={cs}>{cs}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                )}
                 <FormField
                    control={control}
                    name="classes_taught"
                    render={() => (
                        <FormItem>
                            <div className="mb-4">
                                <FormLabel className="text-base">
                                    {role === 'classTeacher' ? 'Also Teaches (as Subject Teacher)' : 'Assign Classes to Subject Teacher'}
                                </FormLabel>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {allClassSections.map((item) => (
                                    <FormField
                                        key={item}
                                        control={control}
                                        name="classes_taught"
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
                 <FormItem>
                    <FormLabel>Qualifications</FormLabel>
                    <div className="flex gap-2">
                        <Input value={qualificationInput} onChange={(e) => setQualificationInput(e.target.value)} placeholder="e.g., M.Sc. in Physics" />
                        <Button type="button" variant="outline" onClick={handleAddQualification}><PlusCircle/></Button>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                        {qualifications.map((q, i) => (
                            <div key={i} className="flex items-center gap-2 bg-secondary rounded-full pl-3 pr-1 py-1 text-sm">
                                {q}
                                <button type="button" onClick={() => handleRemoveQualification(i)} className="rounded-full bg-secondary-foreground/10 text-secondary-foreground hover:bg-secondary-foreground/20 h-5 w-5 flex items-center justify-center">
                                    <X className="h-3 w-3"/>
                                </button>
                            </div>
                        ))}
                    </div>
                </FormItem>
                 <FormField
                    control={control}
                    name="photo"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Teacher's Photo</FormLabel>
                        <FormControl>
                            <Input type="file" accept="image/png, image/jpeg" {...form.register("photo")} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Teacher
          </Button>
        </form>
      </Form>
    </>
  );
}
