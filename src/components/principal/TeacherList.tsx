
"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import type { Teacher } from "./PrincipalDashboard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";
import { Edit, Trash2, Loader2, Info, Printer, FileDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format as formatDate } from "date-fns";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { Textarea } from "../ui/textarea";
import { Separator } from "../ui/separator";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";


const classes = ["Nursery", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const sections = ["A", "B"];
const allClassSections = classes.flatMap(c => sections.map(s => `${c}-${s}`));

const editTeacherSchema = z.object({
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
  joiningDate: z.number(),
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

interface TeacherListProps {
  teachers: Teacher[];
  isLoading: boolean;
  onUpdateTeacher: (id: string, data: Partial<Teacher>) => void;
  onDeleteTeacher: (id: string) => void;
}

const handlePrintLetter = (teacherData: Teacher) => {
    if (!teacherData) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Please allow pop-ups to print the joining letter.");
        return;
    }

    const formattedJoiningDate = teacherData.joiningDate 
        ? new Date(teacherData.joiningDate).toLocaleString('en-GB', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true 
          })
        : 'N/A';

    printWindow.document.write(`
        <html>
            <head>
                <title>Joining Letter - ${teacherData.name}</title>
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
                    @media print {
                        .no-print { display: none; }
                    }
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
                        
                        <p>Dear ${teacherData.name},</p>
                        
                        <p>We are pleased to offer you the position at Hilton Convent School. We were impressed with your qualifications and experience and believe you will be a valuable asset to our team.</p>
                        
                        <p>Your joining date is officially recorded as <strong>${formattedJoiningDate}</strong>. Please find your details below:</p>
                        
                        <table class="details">
                            <tr><td>Teacher ID</td><td>${teacherData.id}</td></tr>
                            <tr><td>Full Name</td><td>${teacherData.name}</td></tr>
                             <tr><td>Role</td><td>${teacherData.role === 'classTeacher' ? 'Class Teacher' : 'Subject Teacher'}</td></tr>
                            ${teacherData.role === 'classTeacher' ? `<tr><td>Assigned Class</td><td>${teacherData.classTeacherOf}</td></tr>` : ''}
                            ${teacherData.role === 'subjectTeacher' ? `<tr><td>Classes Taught</td><td>${teacherData.classesTaught?.join(', ')}</td></tr>` : ''}
                            <tr><td>Primary Subject</td><td>${teacherData.subject}</td></tr>
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
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
    }, 500);
  }

export function TeacherList({ teachers, isLoading, onUpdateTeacher, onDeleteTeacher }: TeacherListProps) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<z.infer<typeof editTeacherSchema>>({
    resolver: zodResolver(editTeacherSchema),
  });

  const { formState: { isSubmitting: isUpdating }, reset, watch } = form;
  const role = watch("role");

  const handleDeleteClick = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedTeacher) {
      setIsDeleting(true);
      await onDeleteTeacher(selectedTeacher.id);
      setIsDeleting(false);
      setIsAlertOpen(false);
      setSelectedTeacher(null);
    }
  };

  const handleEditClick = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    reset({
        ...teacher,
        dob: new Date(teacher.dob),
        classesTaught: teacher.classesTaught || [],
    });
    setIsEditOpen(true);
  };

  async function onEditSubmit(values: z.infer<typeof editTeacherSchema>) {
    if(selectedTeacher) {
        const updatedData = {
            ...values,
            dob: formatDate(values.dob, "yyyy-MM-dd"),
        };
        await onUpdateTeacher(selectedTeacher.id, updatedData);
        setIsEditOpen(false);
        setSelectedTeacher(null);
    }
  }

  const handleExport = () => {
    const dataToExport = teachers.map(teacher => ({
        "Teacher ID": teacher.id,
        "Name": teacher.name,
        "Role": teacher.role === 'classTeacher' ? 'Class Teacher' : 'Subject Teacher',
        "Assignment": teacher.role === 'classTeacher' ? teacher.classTeacherOf : teacher.classesTaught?.join(', '),
        "Subject": teacher.subject,
        "Phone Number": teacher.phoneNumber,
        "DOB": teacher.dob,
        "Joining Date": new Date(teacher.joiningDate).toLocaleString('en-GB'),
        "Father's Name": teacher.fatherName,
        "Address": teacher.address,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Teachers");
    XLSX.writeFile(workbook, `Teachers_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  }


  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Teacher ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joining Date</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell className="text-right flex justify-end gap-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (teachers.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Teachers Found</h3>
            <p className="text-muted-foreground mt-2">Get started by adding a new teacher to the system.</p>
      </div>
    );
  }

  return (
    <>
    <TooltipProvider>
        <div className="flex justify-end mb-4">
             <Button variant="outline" onClick={handleExport}>
                <FileDown className="mr-2 h-4 w-4" />
                Export as Excel
            </Button>
        </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Teacher ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role / Assignment</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Joining Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.map((teacher) => (
              <TableRow key={teacher.id}>
                <TableCell className="font-mono">{teacher.id}</TableCell>
                <TableCell className="font-medium">{teacher.name}</TableCell>
                <TableCell>
                  {teacher.role === 'classTeacher' ? (
                    <Badge variant="secondary">Class Teacher: {teacher.classTeacherOf}</Badge>
                  ) : (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge variant="outline" className="cursor-pointer">
                                Subject Teacher
                                <Info className="ml-1.5 h-3 w-3" />
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Teaches: {teacher.classesTaught?.join(', ')}</p>
                        </TooltipContent>
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell>{teacher.subject}</TableCell>
                <TableCell>
                    {teacher.joiningDate ? formatDate(new Date(teacher.joiningDate), 'dd MMM, yyyy') : 'N/A'}
                </TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handlePrintLetter(teacher)}>
                        <Printer className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(teacher)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(teacher)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      </TooltipProvider>

       <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the record for {selectedTeacher?.name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
                <DialogTitle>Edit Teacher Details</DialogTitle>
            </DialogHeader>
            {selectedTeacher && (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto p-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full Name</FormLabel>
                                    <FormControl>
                                    <Input {...field} />
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
                                name="fatherName"
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
                                control={form.control}
                                name="motherName"
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
                                control={form.control}
                                name="phoneNumber"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone Number</FormLabel>
                                    <FormControl>
                                    <Input {...field} />
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
                                    <Textarea {...field} />
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
                                        <Input {...field} />
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
                                            className="flex items-center space-x-4"
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

                             {role === "subjectTeacher" && (
                                <FormField
                                    control={form.control}
                                    name="classesTaught"
                                    render={() => (
                                        <FormItem>
                                            <div className="mb-4">
                                                <FormLabel className="text-base">Classes Taught</FormLabel>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={isUpdating}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isUpdating}>
                                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            )}
        </DialogContent>
      </Dialog>
    </>
  );
}

    
