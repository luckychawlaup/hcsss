
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { format, subDays } from "date-fns";
import type { Teacher } from "@/lib/supabase/teachers";
import type { Student } from "@/lib/supabase/students";
import { getAttendanceForClass, setAttendance, AttendanceRecord } from "@/lib/supabase/attendance";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, CalendarIcon, Save, UserX, UserCheck, UserMinus, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type AttendanceStatus = "present" | "absent" | "half-day";

const statusCycle: Record<AttendanceStatus, AttendanceStatus> = {
    present: 'absent',
    absent: 'half-day',
    'half-day': 'present'
};

const statusConfig: Record<AttendanceStatus, { 
    label: string; 
    icon: React.ReactNode; 
    cardClass: string; 
    textClass: string;
    badgeVariant: "default" | "destructive" | "secondary" | "outline";
}> = {
    present: { 
        label: 'Present', 
        icon: <UserCheck className="w-4 h-4" />, 
        cardClass: 'bg-green-50 border-green-200 hover:bg-green-100', 
        textClass: 'text-green-700',
        badgeVariant: 'default'
    },
    absent: { 
        label: 'Absent', 
        icon: <UserX className="w-4 h-4" />, 
        cardClass: 'bg-red-50 border-red-200 hover:bg-red-100', 
        textClass: 'text-red-700',
        badgeVariant: 'destructive'
    },
    'half-day': { 
        label: 'Half Day', 
        icon: <UserMinus className="w-4 h-4" />, 
        cardClass: 'bg-orange-50 border-orange-200 hover:bg-orange-100', 
        textClass: 'text-orange-700',
        badgeVariant: 'secondary'
    }
};

interface MarkAttendanceProps {
    teacher: Teacher | null;
    students: Student[];
}

export default function MarkAttendance({ teacher, students }: MarkAttendanceProps) {
    const [attendanceDate, setAttendanceDate] = useState<Date>(new Date());
    const [studentStatuses, setStudentStatuses] = useState<Record<string, AttendanceStatus>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const { toast } = useToast();

    const classTeacherOf = useMemo(() => {
        return teacher?.role === 'classTeacher' ? teacher.class_teacher_of : null;
    }, [teacher]);
    
    const studentsInClass = useMemo(() => {
        if (!classTeacherOf) return [];
        return students.filter(s => `${s.class}-${s.section}` === classTeacherOf);
    }, [students, classTeacherOf]);

    const loadAttendance = useCallback(async (date: Date) => {
        if (!classTeacherOf) return;
        setIsLoading(true);
        try {
            const records = await getAttendanceForClass(classTeacherOf, date);
            const statuses: Record<string, AttendanceStatus> = {};
            studentsInClass.forEach(student => {
                const record = records.find(r => r.student_id === student.id);
                statuses[student.id] = record?.status || 'present';
            });
            setStudentStatuses(statuses);
        } catch (error) {
            console.error('Failed to load attendance:', error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load attendance records." });
        } finally {
            setIsLoading(false);
        }
    }, [classTeacherOf, studentsInClass, toast]);

    useEffect(() => {
        if (classTeacherOf && studentsInClass.length > 0) {
            loadAttendance(attendanceDate);
        } else {
            setIsLoading(false);
        }
    }, [attendanceDate, classTeacherOf, studentsInClass, loadAttendance]);

    const handleDateChange = (date: Date | undefined) => {
        if (date) {
            setAttendanceDate(date);
            setSelectedStudents([]);
        }
    };
    
    const handleStatusChange = (studentId: string) => {
        setStudentStatuses(prev => {
            const currentStatus = prev[studentId] || 'present';
            const newStatus = statusCycle[currentStatus];
            return { ...prev, [studentId]: newStatus };
        });
    };

    const handleSelectionChange = (studentId: string, checked: boolean) => {
        setSelectedStudents(prev => {
            return checked ? [...prev, studentId] : prev.filter(id => id !== studentId);
        });
    };

    const handleSelectAll = (checked: boolean) => {
        setSelectedStudents(checked ? studentsInClass.map(s => s.id) : []);
    };

    const handleBulkMark = (status: AttendanceStatus) => {
        if (selectedStudents.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No Students Selected',
                description: 'Please select students to mark their attendance.'
            });
            return;
        }
        
        setStudentStatuses(prev => {
            const newStatuses = { ...prev };
            selectedStudents.forEach(id => { newStatuses[id] = status; });
            return newStatuses;
        });
        setSelectedStudents([]); // Deselect all after action
        
        toast({
            title: 'Bulk Action Applied',
            description: `Marked ${selectedStudents.length} students as ${status}.`
        });
    };

    const handleSubmit = async () => {
        if (!classTeacherOf || !teacher) {
            console.error('Missing class or teacher information');
            toast({ variant: "destructive", title: "Error", description: "Cannot save attendance. Teacher or class info missing." });
            return;
        }
        
        setIsSubmitting(true);
        try {
            const attendanceData: Omit<AttendanceRecord, 'id'>[] = studentsInClass.map(student => ({
                student_id: student.id,
                class_section: classTeacherOf,
                date: format(attendanceDate, "yyyy-MM-dd"),
                status: studentStatuses[student.id] || 'present',
                marked_by: teacher.id,
            }));
            
            if (attendanceData.length === 0) {
                throw new Error('No students found to mark attendance for');
            }
            
            await setAttendance(attendanceData);
            
            toast({ 
                title: "Success", 
                description: `Attendance for ${format(attendanceDate, "PPP")} has been saved successfully.` 
            });
        } catch (error) {
            console.error('Failed to save attendance:', error);
            toast({ 
                variant: "destructive", 
                title: "Error", 
                description: `Failed to save attendance: ${error instanceof Error ? error.message : 'Unknown error'}` 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleQuickMarkAll = (status: AttendanceStatus) => {
        const newStatuses: Record<string, AttendanceStatus> = {};
        studentsInClass.forEach(student => { newStatuses[student.id] = status; });
        setStudentStatuses(newStatuses);
        toast({
            title: 'Quick Action Applied',
            description: `Marked all students as ${status}.`
        });
    };
    
    if (teacher?.role !== 'classTeacher') {
        return (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
                <UserX className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Permission Denied</h3>
                <p className="text-muted-foreground mt-2">Only Class Teachers can mark attendance.</p>
            </div>
        );
    }

    const presentCount = Object.values(studentStatuses).filter(s => s === 'present').length;
    const absentCount = Object.values(studentStatuses).filter(s => s === 'absent').length;
    const halfDayCount = Object.values(studentStatuses).filter(s => s === 'half-day').length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button 
                                variant="outline" 
                                className={cn(
                                    "w-full sm:w-[280px] justify-start text-left font-normal",
                                    !attendanceDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {attendanceDate ? format(attendanceDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar 
                                mode="single" 
                                selected={attendanceDate} 
                                onSelect={handleDateChange} 
                                initialFocus 
                                disabled={(date) => date > new Date() || date < subDays(new Date(), 3)}
                            />
                        </PopoverContent>
                    </Popover>
                    
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                            Class: <span className="font-medium text-foreground">{classTeacherOf}</span>
                        </span>
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                        <UserCheck className="w-3 h-3 mr-1" />
                        Present: {presentCount}
                    </Badge>
                    <Badge variant="outline" className="bg-red-50 text-red-700">
                        <UserX className="w-3 h-3 mr-1" />
                        Absent: {absentCount}
                    </Badge>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700">
                        <UserMinus className="w-3 h-3 mr-1" />
                        Half Day: {halfDayCount}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="p-4">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Bulk Actions</Label>
                            <Badge variant="outline">{selectedStudents.length} selected</Badge>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="select-all"
                                checked={studentsInClass.length > 0 && selectedStudents.length === studentsInClass.length}
                                onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                            />
                            <Label htmlFor="select-all" className="text-sm">Select All Students</Label>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                            <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleBulkMark('present')} 
                                disabled={selectedStudents.length === 0}
                                className="text-green-700 border-green-200 hover:bg-green-50"
                            >
                                <UserCheck className="mr-1 h-3 w-3" />
                                Mark Present
                            </Button>
                            <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleBulkMark('absent')} 
                                disabled={selectedStudents.length === 0}
                                className="text-red-700 border-red-200 hover:bg-red-50"
                            >
                                <UserX className="mr-1 h-3 w-3" />
                                Mark Absent
                            </Button>
                            <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleBulkMark('half-day')} 
                                disabled={selectedStudents.length === 0}
                                className="text-orange-700 border-orange-200 hover:bg-orange-50"
                            >
                                <UserMinus className="mr-1 h-3 w-3" />
                                Mark Half Day
                            </Button>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex flex-col gap-3">
                        <Label className="text-sm font-medium">Quick Mark All</Label>
                        <div className="flex flex-wrap gap-2">
                            <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleQuickMarkAll('present')}
                                className="text-green-700 border-green-200 hover:bg-green-50"
                            >
                                <UserCheck className="mr-1 h-3 w-3" />
                                All Present
                            </Button>
                            <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleQuickMarkAll('absent')}
                                className="text-red-700 border-red-200 hover:bg-red-50"
                            >
                                <UserX className="mr-1 h-3 w-3" />
                                All Absent
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Loading students...</p>
                </div>
            ) : studentsInClass.length === 0 ? (
                <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto" />
                    <h3 className="mt-4 text-lg font-semibold">No Students Found</h3>
                    <p className="text-muted-foreground mt-2">No students are assigned to your class.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {studentsInClass.map(student => {
                        const status = studentStatuses[student.id] || 'present';
                        const config = statusConfig[status];
                        const isSelected = selectedStudents.includes(student.id);
                        
                        return (
                            <Card 
                                key={student.id} 
                                className={cn(
                                    "text-center transition-all duration-200 relative cursor-pointer border-2",
                                    config.cardClass,
                                    isSelected && "ring-2 ring-blue-500 ring-offset-2"
                                )}
                            >
                                <div className="absolute top-2 right-2 z-10">
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={(checked) => handleSelectionChange(student.id, Boolean(checked))}
                                        className="bg-white shadow-sm"
                                    />
                                </div>
                                
                                <CardContent 
                                    className="p-3 flex flex-col items-center justify-center gap-2"
                                    onClick={() => handleStatusChange(student.id)}
                                >
                                    <div className="w-full pt-4">
                                        <p className="font-medium text-xs truncate mb-1" title={student.name}>
                                            {student.name}
                                        </p>
                                        <Badge 
                                            variant={config.badgeVariant}
                                            className="text-xs py-0 px-2 h-5"
                                        >
                                            {config.icon}
                                            <span className="ml-1">{config.label}</span>
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
            
            <div className="flex justify-center pt-4">
                <Button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting || isLoading || studentsInClass.length === 0} 
                    className="w-full max-w-md h-12 text-base font-medium"
                    size="lg"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving Attendance...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Attendance
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
