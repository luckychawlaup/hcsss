
"use client";

import { useState, useMemo } from "react";
import type { Student } from "@/lib/firebase/students";
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
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";
import { Input } from "../ui/input";
import { Edit, Trash2, Loader2, Info, ArrowLeft, FileDown, Search, Users } from "lucide-react";
import { Card, CardContent } from "../ui/card";

interface StudentListProps {
  students: Student[];
  isLoading: boolean;
  onUpdateStudent: (id: string, data: Partial<Student>) => void;
  onDeleteStudent: (id: string) => void;
}

export function StudentList({ students, isLoading, onUpdateStudent, onDeleteStudent }: StudentListProps) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  const handleDeleteClick = (student: Student) => {
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
  
  const studentsByClass = useMemo(() => {
    return students.reduce((acc, student) => {
      const classKey = `${student.class}-${student.section}`;
      if (!acc[classKey]) {
        acc[classKey] = [];
      }
      acc[classKey].push(student);
      return acc;
    }, {} as Record<string, Student[]>);
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!selectedClass || !studentsByClass[selectedClass]) return [];
    return studentsByClass[selectedClass].filter(student => 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.srn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.fatherName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [selectedClass, studentsByClass, searchTerm]);

  const handleExport = () => {
    if (!selectedClass) return;

    const dataToExport = filteredStudents.map(({ id, ...student }) => ({
        "SRN": student.srn,
        "Name": student.name,
        "Class": `${student.class}-${student.section}`,
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
        <Users className="h-12 w-12 text-muted-foreground" />
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
                    <TableHead>SRN</TableHead>
                    <TableHead>Name</TableHead>
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
                            <TableCell className="font-medium">{student.name}</TableCell>
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
                    This action cannot be undone. This will permanently delete the student's record and all associated data for {studentToDelete?.name}.
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
