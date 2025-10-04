

"use client";

import { useState, useMemo } from "react";
import type { CombinedStudent, PendingStudent, Student } from "@/lib/supabase/students";
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

import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";
import { Input } from "../ui/input";
import { Edit, Trash2, Loader2, ArrowLeft, FileDown, Search, Users, UserX, KeyRound, Copy, Info } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const classes = ["Nursery", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const sections = ["A", "B"];

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
  const [selectedStudentForKey, setSelectedStudentForKey] = useState<CombinedStudent | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<CombinedStudent | null>(null);
  const { toast } = useToast();

  const handleEditClick = (student: CombinedStudent) => {
    // Edit functionality can be re-added if needed
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
  
  const handleViewKey = (student: CombinedStudent) => {
    setSelectedStudentForKey(student);
    setIsKeyDialogOpen(true);
  }

  const handleForcePasswordReset = async () => {
    if (!selectedStudentForKey) return;
    setIsRegenerating(true);
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(selectedStudentForKey.email);
        if (error) throw error;
        toast({ title: "Password Reset Sent", description: `An email has been sent to ${selectedStudentForKey.email} to reset their password.` });
        setIsKeyDialogOpen(false);
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to send password reset email." });
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
      (student.father_name && student.father_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [selectedClass, studentsByClass, searchTerm]);

  const handleExport = () => {
    toast({
        title: "Export Disabled",
        description: "The library required for Excel export has been removed. Please ask to have it re-installed.",
        variant: "destructive"
    });
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
                    <TableHead>Student ID</TableHead>
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
                            <TableCell className="font-mono">{student.srn}</TableCell>
                            <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                    {student.name}
                                    <Badge variant={student.status === 'Registered' ? 'default' : 'secondary'}>{student.status}</Badge>
                                </div>
                            </TableCell>
                            <TableCell>{student.email}</TableCell>
                            <TableCell>{student.father_name}</TableCell>
                            <TableCell>{student.father_phone || student.mother_phone || student.student_phone}</TableCell>
                            <TableCell className="text-right">
                                {student.status === 'Registered' && (
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
                        <DialogTitle>Account Action for {selectedStudentForKey?.name}</DialogTitle>
                        <DialogDescription>
                            You can force a password reset for this student's account.
                        </DialogDescription>
                    </DialogHeader>
                     <div className="flex items-center justify-between rounded-md border bg-secondary p-3">
                        <span className="font-mono text-sm">{selectedStudentForKey?.email}</span>
                    </div>
                     <DialogFooter className="sm:justify-between gap-2">
                        <Button variant="outline" onClick={handleForcePasswordReset} disabled={isRegenerating}>
                             {isRegenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Force Password Reset
                        </Button>
                        <Button onClick={() => setIsKeyDialogOpen(false)}>Close</Button>
                    </DialogFooter>
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
