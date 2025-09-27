
"use client";

import { useState, useMemo, useEffect } from "react";
import type { Teacher } from "@/lib/supabase/teachers";
import type { Student } from "@/lib/supabase/students";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "../ui/skeleton";
import { Input } from "../ui/input";

interface MarkAttendanceProps {
  teacher: Teacher | null;
  students: Student[];
  isLoading: boolean;
}

type AttendanceStatus = "present" | "absent" | "half-day";

export default function MarkAttendance({ teacher, students, isLoading }: MarkAttendanceProps) {
  const [attendanceDate, setAttendanceDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const classTeacherOf = useMemo(() => {
    if (teacher?.role === 'classTeacher' && teacher.class_teacher_of) {
      return teacher.class_teacher_of;
    }
    return null;
  }, [teacher]);

  const studentsInClass = useMemo(() => {
    if (!classTeacherOf) return [];
    return students.filter(s => `${s.class}-${s.section}` === classTeacherOf);
  }, [students, classTeacherOf]);
  
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
      const newAttendance: Record<string, AttendanceStatus> = {};
      studentsInClass.forEach(student => {
          newAttendance[student.id] = status;
      });
      setAttendance(newAttendance);
  }

  const handleSubmit = async () => {
    setIsSubmitting(true);
    console.log("Submitting attendance for", classTeacherOf, "on", attendanceDate);
    console.log(attendance);
    // Here you would typically save to Supabase
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast({
        title: "Attendance Submitted",
        description: `Attendance for ${classTeacherOf} has been recorded successfully.`
    })
    setIsSubmitting(false);
  };
  
  if (isLoading) {
      return <Skeleton className="h-96 w-full" />
  }

  if (teacher?.role !== 'classTeacher' || !classTeacherOf) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
            <UserX className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Permission Denied</h3>
            <p className="text-muted-foreground mt-2">Only the designated Class Teacher can mark attendance.</p>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
         <div className="flex items-center gap-4">
            <p className="text-lg font-semibold">Class: <span className="text-primary">{classTeacherOf}</span></p>
         </div>
        <Input 
            type="date"
            className="w-full md:w-auto"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
        />
      </div>

       {studentsInClass.length > 0 ? (
         <>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleMarkAll('present')}>Mark All Present</Button>
                <Button variant="outline" size="sm" onClick={() => handleMarkAll('absent')}>Mark All Absent</Button>
            </div>
            <div className="space-y-4 rounded-md border p-4">
                {studentsInClass.map(student => (
                <div key={student.id} className="flex flex-col md:flex-row items-start md:items-center justify-between">
                    <p className="font-medium">{student.name} <span className="font-mono text-xs text-muted-foreground">({student.srn})</span></p>
                    <RadioGroup
                    value={attendance[student.id] || "present"}
                    onValueChange={(value: AttendanceStatus) => handleStatusChange(student.id, value)}
                    className="flex items-center gap-4 mt-2 md:mt-0"
                    >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="present" id={`present-${student.id}`} />
                        <Label htmlFor={`present-${student.id}`} className="font-normal text-green-600">Present</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="absent" id={`absent-${student.id}`} />
                        <Label htmlFor={`absent-${student.id}`} className="font-normal text-red-600">Absent</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="half-day" id={`half-day-${student.id}`} />
                        <Label htmlFor={`half-day-${student.id}`} className="font-normal text-yellow-600">Half Day</Label>
                    </div>
                    </RadioGroup>
                </div>
                ))}
            </div>

            <Button onClick={handleSubmit} disabled={isSubmitting || studentsInClass.length === 0} className="w-full">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Attendance for {classTeacherOf}
            </Button>
         </>
      ) : (
        <div className="text-center py-10 border rounded-md">
          <p className="text-muted-foreground">No students found for your class.</p>
        </div>
      )}

    </div>
  );
}
