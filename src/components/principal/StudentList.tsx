
"use client";

import { useState, useMemo } from "react";
import type { CombinedStudent, PendingStudent, Student } from "@/lib/supabase/students";
import * as XLSX from "xlsx";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format as formatDate, parseISO } from "date-fns";

import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";
import { Input } from "../ui/input";
import { Edit, Trash2, Loader2, ArrowLeft, FileDown, Search, Users, UserX, KeyRound, Copy, Info } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { useToast } from "@/hooks/use-toast";
import { regenerateStudentKey } from "@/lib/supabase/students";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "../ui/calendar";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";

const classes = ["Nursery", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const sections = ["A", "B"];

const editStudentSchema = z.object({
    name: z.string().min(2, "Name is required."),
    email: z.string().email("A valid email is required."),
    fatherName: z.string().min(2, "Father's name is required."),
    motherName: z.string().min(2, "Mother's name is required."),
    address: z.string().min(10, "Address is required."),
    class: z.string(),
    section: z.string(),
    dateOfBirth: z.date(),
    fatherPhone: z.string().optional(),
    motherPhone: z.string().optional(),
    studentPhone: z.string().optional(),
});

interface StudentListProps {
  students: CombinedStudent[];
  isLoading: boolean;
  onUpdateStudent: (id: string, data: Partial<Student>) => void;
  onDeleteStudent: (id: string) => void;
}

export default function StudentList({ students, isLoading, onUpdateStudent, onDeleteStudent }: StudentListProps) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<CombinedStudent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);
  const [selectedStudentForKey, setSelectedStudentForKey] = useState<PendingStudent | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<CombinedStudent | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof editStudentSchema>>({
      resolver: zodResolver(editStudentSchema),
  });

  const { formState: { isSubmitting: isUpdating }, reset } = form;

  const handleEditClick = (student: CombinedStudent) => {
    setStudentToEdit(student);
    reset({
        ...student,
        dateOfBirth: parseISO(student.dateOfBirth),
    });
    setIsEditOpen(true);
  }

  async function onEditSubmit(values: z.infer<typeof editStudentSchema>) {
      if (!studentToEdit) return;
      const { email, ...updatableValues } = values;
      const updatedData = {
          ...updatableValues,
          dateOfBirth: formatDate(values.dateOfBirth, "yyyy-MM-dd"),
      };
      await onUpdateStudent(studentToEdit.id, updatedData);
      toast({ title: "Student Updated", description: `${values.name}'s details have been updated.`});
      setIsEditOpen(false);
      setStudentToEdit(null);
  }


  const handleDeleteClick = (student: CombinedStudent) => {
    setStudentToDelete(student);
    setIsAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (studentToDelete) {
      setIsDeleting(true);
      await onDeleteStudent(studentToDelete.id);
      setIsDeleting(false);
      setIsAlertOpen(false);
      setStudentToDelete(null);
    }
  };
  
  const handleViewKey = (student: PendingStudent) => {
    setSelectedStudentForKey(student);
    setIsKeyDialogOpen(true);
  }

  const handleRegenerateKey = async () => {
    if (!selectedStudentForKey) return;
    setIsRegenerating(true);
    try {
        const newKey = await regenerateStudentKey(selectedStudentForKey.id);
        setSelectedStudentForKey(prev => prev ? { ...prev, registrationKey: newKey, id: newKey } : null);
        toast({ title: "Key Regenerated", description: "A new registration key has been created." });
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to regenerate key." });
    } finally {
        setIsRegenerating(false);
    }
  }
  
  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Registration Key copied to clipboard.",
      });
  };

  const studentsByClass = useMemo(() => {
    return students.reduce((acc, student) => {
      const classKey = `${student.class}-${student.section}`;
      if (!acc[classKey]) {
        acc[classKey] = [];
      }
      acc[classKey].push(student);
      return acc;
    }, {} as Record<string, CombinedStudent[]>);
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!selectedClass || !studentsByClass[selectedClass]) return [];
    return studentsByClass[selectedClass].filter(student => 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.status === "Registered" && student.srn && student.srn.toLowerCase().includes(searchTerm.toLowerCase())) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.fatherName && student.fatherName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [selectedClass, studentsByClass, searchTerm]);

  const handleExport = () => {
    if (!selectedClass) return;

    const dataToExport = filteredStudents.map(({ authUid, ...student }) => ({
        "SRN": student.status === 'Registered' ? student.srn : 'Pending',
        "Name": student.name,
        "Email": student.email,
        "Class": `${student.class}-${student.section}`,
        "Status": student.status,
        "Father's Name": student.fatherName,
        "Mother's Name": student.motherName,
        "Father's Phone": student.fatherPhone || 'N/A',
        "Mother's Phone": student.motherPhone || 'N/A',
        "Student's Phone": student.studentPhone || 'N/A',
        "Address": student.address,
        "Admission Date": new Date(student.admissionDate).toLocaleDateString('en-GB')
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${selectedClass} Students`);
    XLSX.writeFile(workbook, `Students_${selectedClass}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
        <UserX className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No Students Admitted</h3>
        <p className="text-muted-foreground mt-2">Get started by admitting the first student.</p>
      </div>
    );
  }

  if (selectedClass) {
    return (
        <div>
            <div className="flex items-center justify-between mb-4 gap-4">
                <div className="flex items-center gap-2">
                     <Button variant="outline" size="icon" onClick={() => setSelectedClass(null)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h3 className="text-xl font-bold">Students in {selectedClass}</h3>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search students..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Button variant="outline" onClick={handleExport} disabled={filteredStudents.length === 0}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Export Excel
                    </Button>
                </div>
            </div>
            <div className="rounded-md border">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Father's Name</TableHead>
                    <TableHead>Primary Phone</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredStudents.length > 0 ? (
                        filteredStudents.map((student) => (
                        <TableRow key={student.id}>
                            <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                    {student.name}
                                    <Badge variant={student.status === 'Registered' ? 'default' : 'secondary'}>{student.status}</Badge>
                                </div>
                            </TableCell>
                            <TableCell>{student.email}</TableCell>
                            <TableCell>{student.fatherName}</TableCell>
                            <TableCell>{student.fatherPhone || student.motherPhone || student.studentPhone}</TableCell>
                            <TableCell className="text-right">
                                {student.status === 'Pending' && (
                                     <Button variant="ghost" size="icon" onClick={() => handleViewKey(student)}>
                                        <KeyRound className="h-4 w-4" />
                                    </Button>
                                )}
                                <Button variant="ghost" size="icon" onClick={() => handleEditClick(student)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(student)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No students found in this class matching your search.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
             <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the record for {studentToDelete?.name}. This action cannot be undone.
                      {studentToDelete?.status === 'Registered' && ' This will also delete their login account.'}
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

            <Dialog open={isKeyDialogOpen} onOpenChange={setIsKeyDialogOpen}>
                <DialogContent>
                     <DialogHeader>
                        <DialogTitle>Registration Key for {selectedStudentForKey?.name}</DialogTitle>
                        <DialogDescription>
                            Share this one-time key with the student to complete their account registration.
                        </DialogDescription>
                    </DialogHeader>
                     <div className="flex items-center justify-between rounded-md border bg-secondary p-3">
                        <span className="font-mono text-lg text-primary">{selectedStudentForKey?.registrationKey}</span>
                        <Button size="sm" variant="ghost" onClick={() => copyToClipboard(selectedStudentForKey!.registrationKey)}>
                            <Copy className="mr-2 h-4 w-4" /> Copy
                        </Button>
                    </div>
                     <DialogFooter className="sm:justify-between gap-2">
                        <Button variant="outline" onClick={handleRegenerateKey} disabled={isRegenerating}>
                             {isRegenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Regenerate Key
                        </Button>
                        <Button onClick={() => setIsKeyDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-4xl">
                     <DialogHeader>
                        <DialogTitle>Edit Student: {studentToEdit?.name}</DialogTitle>
                        <DialogDescription>Update the student's details below.</DialogDescription>
                    </DialogHeader>
                     <Form {...form}>
                        <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-4">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl><Input {...field} readOnly className="cursor-not-allowed bg-secondary/50" /></FormControl>
                                        <FormMessage />
                                        <div className='flex items-center gap-2 text-xs text-muted-foreground p-2 rounded-md border border-dashed border-amber-500/50 bg-amber-500/10'>
                                            <Info className="h-4 w-4 text-amber-600"/>
                                            <span>Email cannot be changed after registration.</span>
                                        </div>
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="fatherName" render={({ field }) => (
                                    <FormItem><FormLabel>Father's Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name="motherName" render={({ field }) => (
                                    <FormItem><FormLabel>Mother's Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="fatherPhone" render={({ field }) => (
                                    <FormItem><FormLabel>Father's Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name="motherPhone" render={({ field }) => (
                                    <FormItem><FormLabel>Mother's Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name="studentPhone" render={({ field }) => (
                                    <FormItem><FormLabel>Student's Phone (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                                     <FormItem className="flex flex-col"><FormLabel>Date of Birth</FormLabel>
                                         <Popover><PopoverTrigger asChild><FormControl>
                                             <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                 {field.value ? formatDate(field.value, "PPP") : <span>Pick a date</span>}
                                                 <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                             </Button>
                                         </FormControl></PopoverTrigger>
                                         <PopoverContent className="w-auto p-0" align="start">
                                             <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1990-01-01")} initialFocus />
                                         </PopoverContent></Popover><FormMessage />
                                     </FormItem>
                                )}/>
                                <FormField control={form.control} name="class" render={({ field }) => (
                                     <FormItem><FormLabel>Class</FormLabel>
                                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                                             <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                             <SelectContent>{classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                         </Select><FormMessage />
                                     </FormItem>
                                )}/>
                                <FormField control={form.control} name="section" render={({ field }) => (
                                     <FormItem><FormLabel>Section</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>{sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                        </Select><FormMessage />
                                    </FormItem>
                                )}/>
                                 <FormField control={form.control} name="address" render={({ field }) => (
                                    <FormItem className="md:col-span-2"><FormLabel>Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isUpdating}>
                                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    )
  }

  return (
    <div>
        <h3 className="text-lg font-semibold mb-4">Select a class to view students</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.keys(studentsByClass).sort().map(classKey => (
                <Card 
                    key={classKey}
                    className="hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                    onClick={() => setSelectedClass(classKey)}
                >
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                         <Users className="h-8 w-8 mb-2" />
                        <p className="font-bold text-lg">{classKey}</p>
                        <p className="text-sm text-muted-foreground">{studentsByClass[classKey].length} students</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    </div>
  );
}
