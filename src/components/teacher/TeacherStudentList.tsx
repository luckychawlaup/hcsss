

"use client";

import { useMemo, useState } from "react";
import type { CombinedStudent, Student } from "@/lib/supabase/students";
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
import { Users, Search, Edit, FileDown, Loader2, PlusCircle, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Textarea } from "../ui/textarea";

const editStudentSchema = z.object({
  student_phone: z.string().optional(),
  email: z.string().email({ message: "Invalid email format." }).optional().or(z.literal('')),
  roll_number: z.string().optional(),
  house: z.string().optional(),
  emergency_contacts: z.array(z.object({
    name: z.string().min(1, "Name cannot be empty"),
    phone: z.string().min(10, "Phone number seems too short")
  })).optional(),
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

  const { control, handleSubmit, reset, formState: { isSubmitting } } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "emergency_contacts",
  });

  const filteredStudents = useMemo(() => {
    return students.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.status === 'Registered' && student.srn && student.srn.toLowerCase().includes(searchTerm.toLowerCase())) ||
      `${student.class}-${student.section}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

   const handleExport = () => {
    toast({
        title: "Export Disabled",
        description: "The library required for Excel export has been removed. Please ask to have it re-installed.",
        variant: "destructive"
    });
  };
  
  const handleEditClick = (student: CombinedStudent) => {
    setStudentToEdit(student);
    const emergency_contacts = Array.isArray(student.emergency_contacts)
        ? student.emergency_contacts.map(contact => {
            const [name, ...phoneParts] = contact.split(':');
            return { name: name?.trim() || '', phone: phoneParts.join(':').trim() || '' };
        }).filter(c => c.name && c.phone)
        : [];
    
    reset({
      student_phone: student.student_phone || '',
      email: student.email || '',
      roll_number: student.roll_number || '',
      house: student.house || '',
      emergency_contacts: emergency_contacts
    });
    setIsEditOpen(true);
  }

  const onUpdateSubmit = async (values: z.infer<typeof editStudentSchema>) => {
    if (!studentToEdit) return;

    const emergency_contacts_string = values.emergency_contacts
      ?.filter(c => c.name && c.phone)
      .map(c => `${c.name}: ${c.phone}`);

    const updatePayload = {
      ...values,
      emergency_contacts: emergency_contacts_string,
    };
    
    try {
        await onUpdateStudent(studentToEdit.id, updatePayload);
        toast({
            title: "Student Updated",
            description: `${studentToEdit.name}'s details have been updated.`
        });
        setIsEditOpen(false);
        setStudentToEdit(null);
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: "Could not update the student's details."
        });
    }
  }


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
                  <TableCell>{student.father_name}</TableCell>
                  <TableCell>{student.father_phone || student.mother_phone}</TableCell>
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
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Student: {studentToEdit?.name}</DialogTitle>
                    <DialogDescription>
                        Update the student's academic and communication details.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={handleSubmit(onUpdateSubmit)} className="space-y-4 max-h-[60vh] overflow-y-auto p-1 pr-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <FormField
                          control={control}
                          name="student_phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Student's Phone (WhatsApp)</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Student's Email</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={control}
                          name="roll_number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Roll Number</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                            control={form.control}
                            name="house"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>House</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Assign a house"/>
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Red">Red</SelectItem>
                                    <SelectItem value="Green">Green</SelectItem>
                                    <SelectItem value="Blue">Blue</SelectItem>
                                    <SelectItem value="Yellow">Yellow</SelectItem>
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                    <div>
                      <Label>Emergency Contacts</Label>
                       {fields.map((field, index) => (
                          <div key={field.id} className="flex items-center gap-2 pt-2">
                              <FormField control={control} name={`emergency_contacts.${index}.name`} render={({ field }) => (<FormItem className="flex-1"><FormControl><Input {...field} placeholder="Contact Name" /></FormControl><FormMessage/></FormItem>)} />
                              <FormField control={control} name={`emergency_contacts.${index}.phone`} render={({ field }) => (<FormItem className="flex-1"><FormControl><Input {...field} placeholder="Phone Number" /></FormControl><FormMessage/></FormItem>)} />
                              <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                      ))}
                       <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => append({ name: "", phone: "" })}>
                          <PlusCircle className="mr-2 h-4 w-4"/> Add Contact
                      </Button>
                    </div>
                  </form>
                </Form>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleSubmit(onUpdateSubmit)} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}

