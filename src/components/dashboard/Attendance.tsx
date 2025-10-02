
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
import { getStudentByAuthId, Student } from "@/lib/supabase/students";
import { getStudentAttendanceForMonth, AttendanceRecord } from "@/lib/supabase/attendance";
import { getHolidays, Holiday } from "@/lib/supabase/holidays";
import { format, getDaysInMonth, startOfMonth, addMonths, subMonths, parseISO, isSameDay, startOfDay, isBefore, isAfter } from "date-fns";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type DayStatus = 'present' | 'absent' | 'half-day' | 'sunday' | 'future' | 'unmarked' | 'holiday';

const DayCell = ({ day, status, title }: { day: number, status: DayStatus, title: string }) => {
    const statusClasses: Record<DayStatus, string> = {
        present: "bg-green-500 text-white hover:bg-green-600",
        absent: "bg-red-500 text-white hover:bg-red-600",
        "half-day": "bg-yellow-500 text-white hover:bg-yellow-600",
        sunday: "bg-muted text-muted-foreground",
        future: "bg-secondary text-secondary-foreground",
        unmarked: "bg-gray-200 text-gray-500 hover:bg-gray-300",
        holiday: "bg-blue-500 text-white hover:bg-blue-600",
    };
    
    return (
        <div 
            className={cn(
                "flex items-center justify-center h-10 w-10 rounded-full text-sm font-semibold transition-colors cursor-pointer", 
                statusClasses[status]
            )}
            title={title}
        >
            {day}
        </div>
    );
};

export default function Attendance() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [studentInfo, setStudentInfo] = useState<Student | null>(null);
    const supabase = createClient();

    // Academic session boundaries
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthNum = today.getMonth(); // 0-11
    // Session is from April (month 3) to March of next year
    const academicYearStartYear = currentMonthNum >= 3 ? currentYear : currentYear - 1;
    
    const sessionStartDate = new Date(academicYearStartYear, 3, 1); // April 1st
    const sessionEndDate = new Date(academicYearStartYear + 1, 2, 31); // March 31st

    const fetchAttendanceAndHolidays = useCallback(async (studentId: string, month: Date) => {
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
        const holidaysUnsub = getHolidays(setHolidays);
        return () => {
            if (holidaysUnsub && typeof holidaysUnsub.unsubscribe === 'function') {
                holidaysUnsub.unsubscribe();
            }
        }
    }, []);

    useEffect(() => {
        const getStudentAndSetupSubscription = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const student = await getStudentByAuthId(user.id);
                setStudentInfo(student);

                if (student) {
                    fetchAttendanceAndHolidays(student.id, currentMonth);

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
                                fetchAttendanceAndHolidays(student.id, currentMonth);
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

        const subscriptionCleanupPromise = getStudentAndSetupSubscription();
        
        return () => {
            subscriptionCleanupPromise.then(cleanup => cleanup && cleanup());
        };
        
    }, [currentMonth, supabase, fetchAttendanceAndHolidays]);

    const navigateMonth = (direction: 'prev' | 'next') => {
        const newMonth = direction === 'prev' 
            ? subMonths(currentMonth, 1) 
            : addMonths(currentMonth, 1);

        if (isAfter(newMonth, sessionEndDate) || isBefore(newMonth, sessionStartDate)) {
            return; // Don't navigate outside the academic session
        }

        setCurrentMonth(newMonth);
    };

    const isPrevDisabled = isBefore(startOfMonth(currentMonth), startOfMonth(addMonths(sessionStartDate, 1)));
    const isNextDisabled = isAfter(startOfMonth(currentMonth), startOfMonth(subMonths(sessionEndDate, 1)));


    const renderCalendarDays = () => {
        const monthStart = startOfMonth(currentMonth);
        const daysInMonth = getDaysInMonth(currentMonth);
        const firstDayOfWeek = monthStart.getDay();
        const today = new Date();
        const studentClass = studentInfo ? `${studentInfo.class}-${studentInfo.section}` : null;

        const calendarDays = [];
        
        const statusLabels: Record<DayStatus, string> = {
            present: "Present",
            absent: "Absent", 
            "half-day": "Half Day",
            sunday: "Sunday",
            future: "Future",
            unmarked: "Not Marked",
            holiday: "Holiday",
        };

        const emptyDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
        for (let i = 0; i < emptyDays; i++) {
            calendarDays.push(<div key={`empty-${i}`} className="h-10"></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 12);
            const dayOfWeek = date.getDay();
            const formattedDate = format(date, 'yyyy-MM-dd');

            const record = attendance.find(a => a.date === formattedDate);
            
            const isHoliday = holidays.find(h => {
                const holidayDate = startOfDay(parseISO(h.date));
                const calendarDate = startOfDay(date);
                return isSameDay(holidayDate, calendarDate) && 
                       (!h.class_section || h.class_section === studentClass);
            });

            let status: DayStatus = 'unmarked';
            let title = `Day ${day} - Not Marked`;

            if (dayOfWeek === 0) {
                status = 'holiday';
                title = `Day ${day} - Sunday`;
            } else if (isHoliday) {
                status = 'holiday';
                title = `Day ${day} - ${isHoliday.description}`;
            } else if (date > today) {
                status = 'future';
                 title = `Day ${day} - Future`;
            } else if (record) {
                status = record.status;
                title = `Day ${day} - ${statusLabels[status]}`;
            }

            calendarDays.push(<DayCell key={day} day={day} status={status} title={title} />);
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
        ? Math.round(((attendanceStats.present + attendanceStats.halfDay * 0.5) / attendanceStats.total) * 100) 
        : 0;

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-primary">
                        <UserCheck className="h-6 w-6" />
                        My Attendance
                    </CardTitle>
                    {studentInfo && (
                        <p className="text-sm font-normal text-muted-foreground">
                            {studentInfo.class}-{studentInfo.section}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2 self-start md:self-center">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigateMonth('prev')}
                        disabled={isLoading || isPrevDisabled}
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
                        disabled={isLoading || isNextDisabled}
                        className="h-8 w-8"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex flex-col justify-center items-center h-48 gap-2">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <p className="text-sm text-muted-foreground">Loading attendance...</p>
                    </div>
                ) : (
                    <>
                         {attendance.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6 text-center">
                               <div className="p-3 rounded-lg bg-green-500/10">
                                   <p className="font-bold text-green-600 text-xl">{attendanceStats.present}</p>
                                   <p className="text-xs text-green-700/80">Present</p>
                               </div>
                                <div className="p-3 rounded-lg bg-red-500/10">
                                   <p className="font-bold text-red-600 text-xl">{attendanceStats.absent}</p>
                                   <p className="text-xs text-red-700/80">Absent</p>
                               </div>
                                <div className="p-3 rounded-lg bg-yellow-500/10">
                                   <p className="font-bold text-yellow-600 text-xl">{attendanceStats.halfDay}</p>
                                   <p className="text-xs text-yellow-700/80">Half Day</p>
                               </div>
                               <div className="p-3 rounded-lg bg-blue-500/10">
                                   <p className="font-bold text-blue-600 text-xl">{attendancePercentage}%</p>
                                   <p className="text-xs text-blue-700/80">Overall</p>
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
                        
                        <div className="grid grid-cols-7 gap-2 mb-4">
                            {renderCalendarDays()}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

