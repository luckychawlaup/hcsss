

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
import { Users, Search, Edit, FileDown, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";


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
  const [updatedHouse, setUpdatedHouse] = useState<Student['house'] | undefined>(undefined);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const filteredStudents = useMemo(() => {
    return students.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.status === 'Registered' && student.srn && student.srn.toLowerCase().includes(searchTerm.toLowerCase())) ||
      `${student.class}-${student.section}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

   const handleExport = () => {
    const dataToExport = filteredStudents.map(({ id, auth_uid, ...student }) => ({
        "SRN": student.status === 'Registered' ? student.srn : 'Pending',
        "Name": student.name,
        "Class": `${student.class}-${student.section}`,
        "Father's Name": student.father_name,
        "Father's Phone": student.father_phone || 'N/A',
        "Mother's Name": student.mother_name,
        "Mother's Phone": student.mother_phone || 'N/A',
    }));

    // This part requires a library like xlsx, which is removed.
    // To re-enable, add `xlsx` to package.json
    console.log("Export to Excel is disabled. Data to export:", dataToExport);
    toast({
        title: "Export Disabled",
        description: "The library required for Excel export has been removed. Please ask to have it re-installed.",
        variant: "destructive"
    });
  };
  
  const handleEditClick = (student: CombinedStudent) => {
    setStudentToEdit(student);
    setUpdatedHouse(student.house);
    setIsEditOpen(true);
  }

  const handleUpdate = async () => {
    if (!studentToEdit || updatedHouse === undefined) return;

    setIsUpdating(true);
    try {
        await onUpdateStudent(studentToEdit.id, { house: updatedHouse });
        toast({
            title: "Student Updated",
            description: `${studentToEdit.name}'s house has been updated successfully.`
        });
        setIsEditOpen(false);
        setStudentToEdit(null);
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: "Could not update the student's details."
        });
    } finally {
        setIsUpdating(false);
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
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Student: {studentToEdit?.name}</DialogTitle>
                    <DialogDescription>
                        As a class teacher, you can assign or change the student's house.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="house-select">House</Label>
                    <Select onValueChange={(value) => setUpdatedHouse(value as Student['house'])} defaultValue={studentToEdit?.house}>
                        <SelectTrigger id="house-select">
                            <SelectValue placeholder="Select a house" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Red">Red</SelectItem>
                            <SelectItem value="Green">Green</SelectItem>
                            <SelectItem value="Blue">Blue</SelectItem>
                            <SelectItem value="Yellow">Yellow</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isUpdating}>Cancel</Button>
                    <Button onClick={handleUpdate} disabled={isUpdating}>
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
