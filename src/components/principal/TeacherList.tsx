
"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import type { Teacher } from "@/lib/firebase/teachers";
import { useRouter } from "next/navigation";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";
import { Edit, Trash2, Loader2, Info, Printer, FileDown, Plus, X, UserX, Landmark } from "lucide-react";
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
  joiningDate: z.number(),
  bankAccount: z.object({
      accountHolderName: z.string().optional(),
      accountNumber: z.string().optional(),
      ifscCode: z.string().optional(),
      bankName: z.string().optional(),
  }).optional(),
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

export function TeacherList({ teachers, isLoading, onUpdateTeacher, onDeleteTeacher }: TeacherListProps) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [qualificationInput, setQualificationInput] = useState("");
  const router = useRouter();

  const form = useForm<z.infer<typeof editTeacherSchema>>({
    resolver: zodResolver(editTeacherSchema),
  });

  const { formState: { isSubmitting: isUpdating }, reset, watch, setValue } = form;
  const role = watch("role");
  const qualifications = watch("qualifications", []);

  const handleDeleteClick = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsAlertOpen(true);
  };
  
  const handlePrintLetter = (teacherId: string) => {
    router.push(`/principal/joining-letter/${teacherId}`);
  }


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
        qualifications: teacher.qualifications || [],
        classesTaught: teacher.classesTaught || [],
        bankAccount: teacher.bankAccount || { accountHolderName: "", accountNumber: "", ifscCode: "", bankName: "" },
    });
    setIsEditOpen(true);
  };
  
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

  async function onEditSubmit(values: z.infer<typeof editTeacherSchema>) {
    if(selectedTeacher) {
        const updatedData: Partial<Teacher> = {
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
        "Email": teacher.email,
        "Role": teacher.role === 'classTeacher' ? 'Class Teacher' : 'Subject Teacher',
        "Assignment": teacher.role === 'classTeacher' ? teacher.classTeacherOf : teacher.classesTaught?.join(', '),
        "Subject": teacher.subject,
        "Phone Number": teacher.phoneNumber,
        "DOB": teacher.dob,
        "Qualifications": teacher.qualifications?.join(', '),
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
            <UserX className="h-12 w-12 text-muted-foreground" />
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
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
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
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <Button variant="ghost" size="icon" onClick={() => handlePrintLetter(teacher.id)}>
                                <Printer className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                         <TooltipContent>Print Joining Letter</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <Button variant="ghost" size="icon" onClick={() => handleEditClick(teacher)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                         <TooltipContent>Edit Teacher</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(teacher)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete Teacher</TooltipContent>
                    </Tooltip>
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
        <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
                <DialogTitle>Edit Teacher Details</DialogTitle>
                 <DialogDescription>
                    Update the teacher's information below.
                </DialogDescription>
            </DialogHeader>
            {selectedTeacher && (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto p-2 pr-4">
                        {/* Personal Details */}
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
                                name="email"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email Address</FormLabel>
                                    <FormControl>
                                    <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                        
                         {/* Academic & Role Details */}
                        <Separator />
                        <p className="font-semibold text-foreground">Academic & Role Details</p>
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
                                control={form.control}
                                name="classesTaught"
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
                        </div>
                        
                        {/* Bank Details */}
                        <Separator />
                        <p className="font-semibold text-foreground flex items-center gap-2"><Landmark/> Bank Account Details</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                             <FormField
                                control={form.control}
                                name="bankAccount.accountHolderName"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Account Holder Name</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="bankAccount.accountNumber"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Account Number</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="bankAccount.ifscCode"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>IFSC Code</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="bankAccount.bankName"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bank Name</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
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
