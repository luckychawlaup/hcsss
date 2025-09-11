
"use client";

import { useMemo, useState } from "react";
import type { Student } from "@/lib/firebase/students";
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
import { Users, Search } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "../ui/button";
import { FileDown } from "lucide-react";

interface TeacherStudentListProps {
  students: Student[];
  isLoading: boolean;
}

export default function TeacherStudentList({ students, isLoading }: TeacherStudentListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredStudents = useMemo(() => {
    return students.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.srn && student.srn.toLowerCase().includes(searchTerm.toLowerCase())) ||
      `${student.class}-${student.section}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

   const handleExport = () => {
    const dataToExport = filteredStudents.map(({ id, authUid, ...student }) => ({
        "SRN": student.srn,
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-mono">{student.srn}</TableCell>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.class}-{student.section}</TableCell>
                  <TableCell>{student.fatherName}</TableCell>
                  <TableCell>{student.fatherPhone || student.motherPhone}</TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        No students found matching your search.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
