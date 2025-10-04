

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
import { Loader2, CalendarIcon, AlertCircle, PlusCircle, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "../ui/textarea";
import { addStudent } from "@/lib/supabase/students";
import { Separator } from "../ui/separator";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";

const classes = ["Nursery", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const sections = ["A", "B", "C", "D"];

const addStudentSchema = z.object({
    name: z.string().min(2, "Student name is required."),
    date_of_birth: z.string().regex(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/, "Date must be in DD/MM/YYYY format."),
    gender: z.enum(["Male", "Female", "Other"], { required_error: "Gender is required."}),
    blood_group: z.string().optional(),
    religion: z.string().optional(),
    category: z.string().optional(),
    
    father_name: z.string().min(2, "Father's name is required."),
    father_phone: z.string().min(10, "A valid phone number is required."),
    father_email: z.string().email("Invalid email format.").optional().or(z.literal('')),
    mother_name: z.string().min(2, "Mother's name is required."),
    mother_phone: z.string().min(10, "A valid phone number is required."),
    mother_email: z.string().email("Invalid email format.").optional().or(z.literal('')),
    
    guardian_name: z.string().optional(),
    guardian_relation: z.string().optional(),
    
    permanent_address: z.string().min(10, "Permanent address is required."),
    current_address: z.string().optional(),

    class: z.string({ required_error: "Class is required."}),
    section: z.string({ required_error: "Section is required."}),
    admission_date: z.date({ required_error: "Admission date is required."}),
    previous_school: z.string().optional(),

    transport_type: z.enum(["Own Vehicle", "Pedestrian", "School Transport"], { required_error: "Please select a transport option."}),
    private_vehicle_number: z.string().optional(),
    school_transport_details: z.object({
        driver_name: z.string().optional(),
        driver_phone: z.string().optional(),
        bus_number: z.string().optional(),
    }).optional(),
});


interface AddStudentFormProps {
    onStudentAdded: () => void;
}

export default function AddStudentForm({ onStudentAdded }: AddStudentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof addStudentSchema>>({
    resolver: zodResolver(addStudentSchema),
    defaultValues: {
      name: "",
      date_of_birth: "",
      father_name: "",
      mother_name: "",
      father_phone: "",
      mother_phone: "",
      permanent_address: "",
      transport_type: "Pedestrian",
    },
  });

  const { control, handleSubmit, reset, watch } = form;
  const transportType = watch("transport_type");


  async function onSubmit(values: z.infer<typeof addStudentSchema>) {
    setIsLoading(true);
    setError(null);
    try {
        await addStudent({
            ...values,
            email: `${values.name.split(' ').join('').toLowerCase()}.${Date.now().toString().slice(-4)}@hcs.com`,
            private_vehicle_number: values.transport_type === 'Own Vehicle' ? values.private_vehicle_number : undefined,
            school_transport_details: values.transport_type === 'School Transport' ? values.school_transport_details : undefined,
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">1. Basic Info</h3>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={control} name="name" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl><Input placeholder="As per Birth Certificate / Aadhaar / TC" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={control} name="date_of_birth" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl><Input placeholder="DD/MM/YYYY" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={control} name="gender" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={control} name="blood_group" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Blood Group (Optional)</FormLabel>
                        <FormControl><Input placeholder="e.g., O+" {...field} /></FormControl>
                    </FormItem>
                )} />
                <FormField control={control} name="religion" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Religion (Optional)</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                )} />
                <FormField control={control} name="category" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Category (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="General">General</SelectItem>
                                <SelectItem value="OBC">OBC</SelectItem>
                                <SelectItem value="SC">SC</SelectItem>
                                <SelectItem value="ST">ST</SelectItem>
                            </SelectContent>
                        </Select>
                    </FormItem>
                )} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">2. Parent / Guardian Details</h3>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={control} name="father_name" render={({ field }) => (<FormItem><FormLabel>Father's Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name="father_phone" render={({ field }) => (<FormItem><FormLabel>Father's Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name="father_email" render={({ field }) => (<FormItem><FormLabel>Father's Email (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name="mother_name" render={({ field }) => (<FormItem><FormLabel>Mother's Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name="mother_phone" render={({ field }) => (<FormItem><FormLabel>Mother's Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name="mother_email" render={({ field }) => (<FormItem><FormLabel>Mother's Email (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormMessage /></FormItem>)} />
                <FormField control={control} name="guardian_name" render={({ field }) => (<FormItem><FormLabel>Guardian's Name (If applicable)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                <FormField control={control} name="guardian_relation" render={({ field }) => (<FormItem><FormLabel>Relation with Guardian</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">3. Address</h3>
            <Separator />
             <div className="grid grid-cols-1 gap-6">
                <FormField control={control} name="permanent_address" render={({ field }) => (<FormItem><FormLabel>Permanent Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name="current_address" render={({ field }) => (<FormItem><FormLabel>Current Address (if different)</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)} />
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">4. Admission & Transport</h3>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={control} name="class" render={({ field }) => (<FormItem><FormLabel>Class</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger></FormControl><SelectContent>{classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={control} name="section" render={({ field }) => (<FormItem><FormLabel>Section</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger></FormControl><SelectContent>{sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={control} name="admission_date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Admission Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? formatDate(field.value, "PPP") : (<span>Pick a date</span>)}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                <FormField control={control} name="previous_school" render={({ field }) => (<FormItem><FormLabel>Previous School Name (Optional)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                 <FormField control={control} name="transport_type" render={({ field }) => (
                    <FormItem className="space-y-3 md:col-span-2"><FormLabel>Mode of Transport</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-x-4 gap-y-2">
                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Pedestrian" /></FormControl><FormLabel className="font-normal">Pedestrian/Walking</FormLabel></FormItem>
                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Own Vehicle" /></FormControl><FormLabel className="font-normal">Own Vehicle</FormLabel></FormItem>
                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="School Transport" /></FormControl><FormLabel className="font-normal">School Transport</FormLabel></FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                {transportType === 'Own Vehicle' && (
                    <FormField control={control} name="private_vehicle_number" render={({ field }) => (<FormItem><FormLabel>Vehicle Registration Number (Optional)</FormLabel><FormControl><Input placeholder="e.g. UP14AB1234" {...field} /></FormControl></FormItem>)} />
                )}
                {transportType === 'School Transport' && (
                    <div className="p-4 border rounded-md space-y-4 bg-secondary/50 md:col-span-2">
                        <h4 className="font-medium">School Transport Details</h4>
                        <FormField control={control} name="school_transport_details.driver_name" render={({ field }) => (<FormItem><FormLabel>Driver Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                        <FormField control={control} name="school_transport_details.driver_phone" render={({ field }) => (<FormItem><FormLabel>Driver Phone</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                        <FormField control={control} name="school_transport_details.bus_number" render={({ field }) => (<FormItem><FormLabel>School Bus Registration Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                    </div>
                )}
            </div>
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

