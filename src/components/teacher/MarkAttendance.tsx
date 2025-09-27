
"use client";

import { useState, useMemo, useEffect } from "react";
import type { Teacher } from "@/lib/supabase/teachers";
import type { Student } from "@/lib/supabase/students";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Loader2, UserX, Check, X, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "../ui/skeleton";
import { Input } from "../ui/input";
import { getAttendanceForDate, setAttendance } from "@/lib/supabase/attendance";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MarkAttendanceProps {
  teacher: Teacher | null;
  students: Student[];
  isLoading: boolean;
}

type AttendanceStatus = "present" | "absent" | "half-day";

const statusCycle: Record<AttendanceStatus, AttendanceStatus> = {
  present: "absent",
  absent: "half-day",
  "half-day": "present",
};

const statusInfo: Record<AttendanceStatus, { icon: React.ElementType, color: string, label: string }> = {
    present: { icon: Check, color: 'bg-green-500/20 text-green-700 border-green-500/30', label: 'Present' },
    absent: { icon: X, color: 'bg-red-500/20 text-red-700 border-red-500/30', label: 'Absent' },
    'half-day': { icon: Clock, color: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30', label: 'Half-day' }
}

const StudentAttendanceCard = ({ student, status, onToggle }: { student: Student, status: AttendanceStatus, onToggle: () => void }) => {
    const { icon: Icon, color, label } = statusInfo[status];
    return (
        <Card
            className={cn("cursor-pointer transition-all duration-200", color)}
            onClick={onToggle}
        >
            <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-background rounded-full">
                    <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                    <p className="font-semibold text-sm truncate">{student.name}</p>
                    <p className="text-xs">{label}</p>
                </div>
            </CardContent>
        </Card>
    );
};

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
    if (classTeacherOf && attendanceDate) {
        setIsFetching(true);
        getAttendanceForDate(classTeacherOf, attendanceDate)
            .then(records => {
                const newAttendanceState: Record<string, AttendanceStatus> = {};
                studentsInClass.forEach(student => {
                    const existingRecord = records.find(r => r.student_id === student.id);
                    newAttendanceState[student.id] = existingRecord ? existingRecord.status : 'present';
                });
                setAttendance(newAttendanceState);
            })
            .catch(error => {
                console.error("Error loading attendance:", error);
                const initialAttendance: Record<string, AttendanceStatus> = {};
                studentsInClass.forEach(student => {
                    initialAttendance[student.id] = 'present';
                });
                setAttendance(initialAttendance);
            })
            .finally(() => setIsFetching(false));
    }
  }, [attendanceDate, classTeacherOf, studentsInClass]);

  const handleStatusToggle = (studentId: string) => {
    setAttendance(prev => ({ 
        ...prev, 
        [studentId]: statusCycle[prev[studentId] || 'present'] 
    }));
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
        const attendanceData = Object.entries(attendance).map(([student_id, status]) => ({
            student_id,
            class_section: classTeacherOf,
            date: format(new Date(attendanceDate), "yyyy-MM-dd"),
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
      return <Skeleton className="h-96 w-full" />;
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
      <Card>
          <CardHeader>
              <CardTitle>Select Date</CardTitle>
              <CardDescription>Choose a date to mark attendance for your class: <span className="font-bold text-primary">{classTeacherOf}</span></CardDescription>
          </CardHeader>
          <CardContent>
            <Input 
                type="date"
                className="w-full md:w-auto"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                max={format(new Date(), "yyyy-MM-dd")}
            />
          </CardContent>
      </Card>

       {studentsInClass.length > 0 ? (
         <>
            {isFetching ? (
                <div className="flex items-center justify-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {studentsInClass.map(student => (
                        <StudentAttendanceCard 
                            key={student.id} 
                            student={student}
                            status={attendance[student.id] || 'present'}
                            onToggle={() => handleStatusToggle(student.id)}
                        />
                    ))}
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => handleMarkAll('present')}>Mark All Present</Button>
                <Button variant="outline" onClick={() => handleMarkAll('absent')}>Mark All Absent</Button>
                <Button onClick={handleSubmit} disabled={isSubmitting || studentsInClass.length === 0 || isFetching} className="flex-1">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Submit Attendance
                </Button>
            </div>
         </>
      ) : (
        <div className="text-center py-10 border rounded-md">
          <p className="text-muted-foreground">No students found for your class.</p>
        </div>
      )}
    </div>
  );
}
