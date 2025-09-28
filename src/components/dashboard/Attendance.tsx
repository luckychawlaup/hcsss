
"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { UserCheck, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getStudentByAuthId } from "@/lib/supabase/students";
import { getStudentAttendanceForMonth, AttendanceRecord } from "@/lib/supabase/attendance";
import { format, getDaysInMonth, startOfMonth, addMonths, subMonths } from "date-fns";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type DayStatus = 'present' | 'absent' | 'half-day' | 'sunday' | 'future' | 'unmarked' | 'holiday';

const DayCell = ({ day, status }: { day: number, status: DayStatus }) => {
    const statusClasses: Record<DayStatus, string> = {
        present: "bg-green-500 text-white hover:bg-green-600",
        absent: "bg-red-500 text-white hover:bg-red-600",
        "half-day": "bg-yellow-500 text-white hover:bg-yellow-600",
        sunday: "bg-muted text-muted-foreground",
        future: "bg-secondary text-secondary-foreground",
        unmarked: "bg-gray-200 text-gray-500 hover:bg-gray-300",
        holiday: "bg-blue-500 text-white hover:bg-blue-600",
    };

    const statusLabels: Record<DayStatus, string> = {
        present: "Present",
        absent: "Absent", 
        "half-day": "Half Day",
        sunday: "Sunday",
        future: "Future",
        unmarked: "Not Marked",
        holiday: "Holiday",
    };
    
    return (
        <div 
            className={cn(
                "flex items-center justify-center h-10 w-10 rounded-full text-sm font-semibold transition-colors cursor-pointer", 
                statusClasses[status]
            )}
            title={`Day ${day} - ${statusLabels[status]}`}
        >
            {day}
        </div>
    );
};

export default function Attendance() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [studentInfo, setStudentInfo] = useState<any>(null);
    const supabase = createClient();

    const fetchAttendance = useCallback(async (studentId: string, month: Date) => {
        setIsLoading(true);
        try {
            const records = await getStudentAttendanceForMonth(studentId, month);
            setAttendance(records);
        } catch (error) {
            console.error("Failed to fetch attendance in component:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const getStudentAndSetupSubscription = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const student = await getStudentByAuthId(user.id);
                if (student) {
                    setStudentInfo(student);
                    fetchAttendance(student.id, currentMonth);

                    const channel = supabase
                        .channel(`public:attendance:student_id=eq.${student.id}`)
                        .on('postgres_changes', { 
                            event: '*', 
                            schema: 'public', 
                            table: 'attendance', 
                            filter: `student_id=eq.${student.id}` 
                        },
                            (payload) => {
                                console.log('Attendance change detected, refetching...');
                                fetchAttendance(student.id, currentMonth);
                            }
                        ).subscribe();
                    
                    return () => {
                        supabase.removeChannel(channel);
                    };
                } else {
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
        };

        const subscriptionCleanup = getStudentAndSetupSubscription();
        
        return () => {
            subscriptionCleanup.then(cleanup => cleanup && cleanup());
        };
        
    }, [currentMonth, fetchAttendance, supabase]);

    const navigateMonth = (direction: 'prev' | 'next') => {
        const newMonth = direction === 'prev' 
            ? subMonths(currentMonth, 1) 
            : addMonths(currentMonth, 1);
        setCurrentMonth(newMonth);
    };

    const renderCalendarDays = () => {
        const monthStart = startOfMonth(currentMonth);
        const daysInMonth = getDaysInMonth(currentMonth);
        const firstDayOfWeek = monthStart.getDay(); 
        const today = new Date();

        const calendarDays = [];
        
        const emptyDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
        for (let i = 0; i < emptyDays; i++) {
            calendarDays.push(<div key={`empty-${i}`} className="h-10"></div>);
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const dayOfWeek = date.getDay();
            const formattedDate = format(date, 'yyyy-MM-dd');
            
            const record = attendance.find(a => a.date === formattedDate);

            let status: DayStatus = 'unmarked';
            
            if (dayOfWeek === 0) {
                status = 'sunday';
            } else if (date > today) {
                status = 'future';
            } else if (record) {
                status = record.status;
            }

            calendarDays.push(<DayCell key={day} day={day} status={status} />);
        }
        
        return calendarDays;
    };

    const attendanceStats = {
        total: attendance.filter(a => a.status !== 'holiday' && a.status !== 'unmarked').length,
        present: attendance.filter(a => a.status === 'present').length,
        absent: attendance.filter(a => a.status === 'absent').length,
        halfDay: attendance.filter(a => a.status === 'half-day').length,
    };
    
    const attendancePercentage = attendanceStats.total > 0 
        ? Math.round((attendanceStats.present / attendanceStats.total) * 100) 
        : 0;

    return (
        <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle className="flex items-center gap-2 text-primary">
                    <UserCheck className="h-6 w-6" />
                    My Attendance
                    {studentInfo && (
                        <span className="text-sm font-normal text-muted-foreground">
                            - {studentInfo.class}-{studentInfo.section}
                        </span>
                    )}
                </CardTitle>
                <div className="flex items-center gap-2 self-center md:self-auto">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigateMonth('prev')}
                        disabled={isLoading}
                        className="h-8 w-8"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-[140px] text-center">
                        <p className="font-bold text-lg">{format(currentMonth, 'MMMM yyyy')}</p>
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigateMonth('next')}
                        disabled={isLoading || startOfMonth(currentMonth) >= startOfMonth(new Date())}
                        className="h-8 w-8"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {attendance.length > 0 && (
                     <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm mb-4 justify-center">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                            <span className="font-medium">Present: {attendanceStats.present}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                             <span className="font-medium">Absent: {attendanceStats.absent}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></div>
                             <span className="font-medium">Half Day: {attendanceStats.halfDay}</span>
                        </div>
                        <div className="font-semibold text-primary">
                            Attendance: {attendancePercentage}%
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted-foreground mb-2">
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                    <span>Sun</span>
                </div>
                {isLoading ? (
                    <div className="flex flex-col justify-center items-center h-48 gap-2">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <p className="text-sm text-muted-foreground">Loading attendance...</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-7 gap-2 mb-4">
                            {renderCalendarDays()}
                        </div>
                        
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs justify-center border-t pt-3">
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div><span>Present</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div><span>Absent</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></div><span>Half Day</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div><span>Holiday</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-gray-200 rounded-full"></div><span>Not Marked</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-muted rounded-full"></div><span>Sunday</span></div>
                        </div>
                        
                        {attendance.length === 0 && !isLoading && (
                            <div className="text-center py-8">
                                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                                <p className="text-muted-foreground">No attendance records found for this month</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Check back after your teacher marks attendance
                                </p>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

    