
"use client";

import { useMemo, useState } from "react";
import type { CombinedStudent, Student } from "@/lib/firebase/students";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Search, Edit, FileDown, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format as formatDate, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
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


interface TeacherStudentListProps {
  students: CombinedStudent[];
  isLoading: boolean;
  isClassTeacher: boolean;
  onUpdateStudent: (id: string, data: Partial<Student>) => void;
}

export default function TeacherStudentList({ students, isLoading, isClassTeacher, onUpdateStudent }: TeacherStudentListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<CombinedStudent | null>(null);
  const { toast } = useToast();

   const form = useForm<z.infer<typeof editStudentSchema>>({
      resolver: zodResolver(editStudentSchema),
  });

  const { formState: { isSubmitting: isUpdating }, reset } = form;


  const handleEditClick = (student: CombinedStudent) => {
    if (!isClassTeacher) return;
    setStudentToEdit(student);
    reset({
        ...student,
        dateOfBirth: parseISO(student.dateOfBirth),
    });
    setIsEditOpen(true);
  }

  async function onEditSubmit(values: z.infer<typeof editStudentSchema>) {
      if (!studentToEdit) return;
      const updatedData = {
          ...values,
          dateOfBirth: formatDate(values.dateOfBirth, "yyyy-MM-dd"),
      };
      await onUpdateStudent(studentToEdit.id, updatedData);
      toast({ title: "Student Updated", description: `${values.name}'s details have been updated.`});
      setIsEditOpen(false);
      setStudentToEdit(null);
  }

  const filteredStudents = useMemo(() => {
    return students.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.status === 'Registered' && student.srn && student.srn.toLowerCase().includes(searchTerm.toLowerCase())) ||
      `${student.class}-${student.section}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

   const handleExport = () => {
    const dataToExport = filteredStudents.map(({ id, authUid, ...student }) => ({
        "SRN": student.status === 'Registered' ? student.srn : 'Pending',
        "Name": student.name,
        "Class": `${student.class}-${student.section}`,
        "Father's Name": student.fatherName,
        "Father's Phone": student.fatherPhone || 'N/A',
        "Mother's Name": student.motherName,
        "Mother's Phone": student.motherPhone || 'N/A',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `My_Students`);
    XLSX.writeFile(workbook, `My_Students_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
        <Users className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No Students Assigned</h3>
        <p className="text-muted-foreground mt-2">There are no students currently assigned to your classes.</p>
      </div>
    );
  }

  return (
    <div>
        <div className="flex items-center justify-between mb-4 gap-4">
             <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search by name, SRN, or class..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                />
            </div>
            <Button variant="outline" onClick={handleExport} disabled={filteredStudents.length === 0}>
                <FileDown className="mr-2 h-4 w-4" />
                Export List
            </Button>
        </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SRN</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Father's Name</TableHead>
              <TableHead>Contact</TableHead>
              {isClassTeacher && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-mono">{student.status === 'Registered' ? student.srn : 'Pending'}</TableCell>
                  <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {student.name}
                        <Badge variant={student.status === 'Registered' ? 'default' : 'secondary'}>{student.status}</Badge>
                      </div>
                  </TableCell>
                  <TableCell>{student.class}-{student.section}</TableCell>
                  <TableCell>{student.fatherName}</TableCell>
                  <TableCell>{student.fatherPhone || student.motherPhone}</TableCell>
                   {isClassTeacher && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditClick(student)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
                <TableRow>
                    <TableCell colSpan={isClassTeacher ? 6 : 5} className="h-24 text-center">
                        No students found matching your search.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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
                              <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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
  );
}
