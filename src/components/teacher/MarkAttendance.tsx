
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { format } from "date-fns";
import type { Teacher } from "@/lib/supabase/teachers";
import type { Student } from "@/lib/supabase/students";
import { getAttendanceForClass, setAttendance, AttendanceRecord } from "@/lib/supabase/attendance";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, CalendarIcon, Save, UserX, UserCheck, UserMinus, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Image from "next/image";

type AttendanceStatus = "present" | "absent" | "half-day";

const statusCycle: Record<AttendanceStatus, AttendanceStatus> = {
    present: 'absent',
    absent: 'half-day',
    'half-day': 'present'
};

const statusConfig: Record<AttendanceStatus, { label: string; icon: React.ReactNode; cardClass: string; textClass: string }> = {
    present: { label: 'Present', icon: <UserCheck />, cardClass: 'bg-green-500/10 border-green-500/30', textClass: 'text-green-600' },
    absent: { label: 'Absent', icon: <UserX />, cardClass: 'bg-red-500/10 border-red-500/30', textClass: 'text-red-600' },
    'half-day': { label: 'Half Day', icon: <UserMinus />, cardClass: 'bg-yellow-500/10 border-yellow-500/30', textClass: 'text-yellow-600' }
};

interface MarkAttendanceProps {
    teacher: Teacher | null;
    students: Student[];
}

export default function MarkAttendance({ teacher, students }: MarkAttendanceProps) {
    const [attendanceDate, setAttendanceDate] = useState<Date>(new Date());
    const [studentStatuses, setStudentStatuses] = useState<Record<string, AttendanceStatus>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const classTeacherOf = useMemo(() => teacher?.role === 'classTeacher' ? teacher.class_teacher_of : null, [teacher]);
    
    const studentsInClass = useMemo(() => {
        if (!classTeacherOf) return [];
        return students.filter(s => `${s.class}-${s.section}` === classTeacherOf);
    }, [students, classTeacherOf]);

    const loadAttendance = useCallback(async () => {
        if (!classTeacherOf) return;
        setIsLoading(true);
        try {
            const records = await getAttendanceForClass(classTeacherOf, attendanceDate);
            const statuses: Record<string, AttendanceStatus> = {};
            studentsInClass.forEach(student => {
                const record = records.find(r => r.student_id === student.id);
                statuses[student.id] = record?.status || 'present';
            });
            setStudentStatuses(statuses);
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to load attendance records." });
        } finally {
            setIsLoading(false);
        }
    }, [classTeacherOf, attendanceDate, studentsInClass, toast]);

    useEffect(() => {
        loadAttendance();
    }, [loadAttendance]);

    const handleStatusChange = (studentId: string) => {
        setStudentStatuses(prev => ({
            ...prev,
            [studentId]: statusCycle[prev[studentId] || 'present']
        }));
    };

    const handleSubmit = async () => {
        if (!classTeacherOf || !teacher) return;
        setIsSubmitting(true);
        try {
            const attendanceData: Omit<AttendanceRecord, 'id'>[] = studentsInClass.map(student => ({
                student_id: student.id,
                class_section: classTeacherOf,
                date: format(attendanceDate, "yyyy-MM-dd"),
                status: studentStatuses[student.id] || 'present',
                marked_by: teacher.id,
            }));
            await setAttendance(attendanceData);
            toast({ title: "Success", description: `Attendance for ${format(attendanceDate, "PPP")} has been saved.` });
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to save attendance." });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (teacher?.role !== 'classTeacher') {
        return (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
                <UserX className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Permission Denied</h3>
                <p className="text-muted-foreground mt-2">Only Class Teachers can mark attendance.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("w-full md:w-[280px] justify-start text-left font-normal", !attendanceDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {attendanceDate ? format(attendanceDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={attendanceDate} onSelect={(date) => date && setAttendanceDate(date)} initialFocus disabled={(date) => date > new Date()} />
                    </PopoverContent>
                </Popover>
                <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-2 text-sm"><UserCheck className="text-green-600"/>Present: {Object.values(studentStatuses).filter(s => s === 'present').length}</div>
                    <div className="flex items-center gap-2 text-sm"><UserX className="text-red-600"/>Absent: {Object.values(studentStatuses).filter(s => s === 'absent').length}</div>
                    <div className="flex items-center gap-2 text-sm"><UserMinus className="text-yellow-600"/>Half Day: {Object.values(studentStatuses).filter(s => s === 'half-day').length}</div>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center"><Loader2 className="animate-spin" /> Loading students...</div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {studentsInClass.map(student => {
                        const status = studentStatuses[student.id] || 'present';
                        const config = statusConfig[status];
                        return (
                            <Card key={student.id} className={cn("text-center cursor-pointer transition-all", config.cardClass)} onClick={() => handleStatusChange(student.id)}>
                                <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
                                     <Image src={student.photo_url || `https://api.dicebear.com/8.x/initials/svg?seed=${student.name}`} alt={student.name} width={64} height={64} className="rounded-full h-16 w-16 object-cover" />
                                    <p className="font-semibold text-sm truncate">{student.name}</p>
                                    <div className={cn("flex items-center gap-1.5 text-xs font-medium", config.textClass)}>
                                        {config.icon}
                                        {config.label}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
            
            <Button onClick={handleSubmit} disabled={isSubmitting || isLoading || studentsInClass.length === 0} className="w-full">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
                {isSubmitting ? "Saving..." : "Save Attendance"}
            </Button>
        </div>
    );
}
