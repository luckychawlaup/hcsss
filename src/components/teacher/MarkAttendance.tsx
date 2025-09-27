
"use client";

import { useState, useMemo, useEffect } from "react";
import type { Teacher } from "@/lib/supabase/teachers";
import type { Student } from "@/lib/supabase/students";
import { format, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "../ui/skeleton";
import { Input } from "../ui/input";
import { getAttendanceForDate, setAttendance, AttendanceRecord } from "@/lib/supabase/attendance";

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
  const [isFetching, setIsFetching] = useState(false);
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
  
  useEffect(() => {
    if (classTeacherOf && attendanceDate && studentsInClass.length > 0) {
        setIsFetching(true);
        
        const initialAttendance: Record<string, AttendanceStatus> = {};
        studentsInClass.forEach(student => {
            initialAttendance[student.id] = 'present';
        });

        getAttendanceForDate(classTeacherOf, attendanceDate)
            .then(records => {
                const fetchedAttendance = { ...initialAttendance };
                records.forEach(record => {
                    if (fetchedAttendance.hasOwnProperty(record.student_id)) {
                        fetchedAttendance[record.student_id] = record.status;
                    }
                });
                setAttendance(fetchedAttendance);
            })
            .catch(error => {
                console.error("Error loading attendance:", error);
                setAttendance(initialAttendance); // Fallback to default
            })
            .finally(() => setIsFetching(false));
    }
  }, [attendanceDate, classTeacherOf, studentsInClass]);

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
    if (!classTeacherOf || !teacher || studentsInClass.length === 0) {
        toast({
            variant: "destructive",
            title: "Cannot Submit",
            description: "Missing required data for attendance submission."
        });
        return;
    }

    setIsSubmitting(true);
    
    try {
        const attendanceData: Omit<AttendanceRecord, 'id' | 'created_at'>[] = Object.entries(attendance).map(([student_id, status]) => ({
            student_id,
            class_section: classTeacherOf,
            date: format(startOfDay(new Date(attendanceDate)), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
            status,
            marked_by: teacher.id
        }));

        await setAttendance(attendanceData);
        
        toast({
            title: "Attendance Recorded",
            description: `Attendance for ${classTeacherOf} on ${format(new Date(attendanceDate), 'do MMM, yyyy')} has been successfully saved.`
        });
    } catch (error) {
        console.error("Attendance submission error:", error);
        toast({
            variant: "destructive",
            title: "Submission Failed",
            description: error instanceof Error ? error.message : "Could not save attendance records. Please try again."
        });
    } finally {
        setIsSubmitting(false);
    }
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
            {isFetching ? (
                <div className="flex items-center justify-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                </div>
            ) : (
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
            )}

            <Button onClick={handleSubmit} disabled={isSubmitting || studentsInClass.length === 0 || isFetching} className="w-full">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
