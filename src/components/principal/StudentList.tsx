
"use client";

import { useState } from "react";
import type { Student } from "@/lib/firebase/students";
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
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";
import { Edit, Trash2, Loader2, Info } from "lucide-react";
import { format as formatDate } from "date-fns";


interface StudentListProps {
  students: Student[];
  isLoading: boolean;
  onUpdateStudent: (id: string, data: Partial<Student>) => void;
  onDeleteStudent: (id: string) => void;
}

export function StudentList({ students, isLoading, onUpdateStudent, onDeleteStudent }: StudentListProps) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleDeleteClick = (student: Student) => {
    setSelectedStudent(student);
    setIsAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedStudent) {
      setIsDeleting(true);
      await onDeleteStudent(selectedStudent.id);
      setIsDeleting(false);
      setIsAlertOpen(false);
      setSelectedStudent(null);
    }
  };
  
  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.srn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.fatherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${student.class}-${student.section}`.toLowerCase().includes(searchTerm.toLowerCase())
  );


  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SRN</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Father's Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
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

  if (students.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-md border border-dashed p-8">
        <p className="text-muted-foreground">No students have been admitted yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SRN</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Father's Name</TableHead>
              <TableHead>Primary Phone</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-mono">{student.srn}</TableCell>
                <TableCell className="font-medium">{student.name}</TableCell>
                <TableCell>
                    <Badge variant="secondary">{student.class}-{student.section}</Badge>
                </TableCell>
                <TableCell>{student.fatherName}</TableCell>
                <TableCell>{student.fatherPhone || student.motherPhone || student.studentPhone}</TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { /* Implement edit functionality */ }}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(student)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

       <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the student's record and all associated data.
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
    </>
  );
}
