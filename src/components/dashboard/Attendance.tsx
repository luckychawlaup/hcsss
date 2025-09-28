
"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { UserCheck, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
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

    const fetchAttendance = async (month: Date) => {
        setIsLoading(true);
        try {
            console.log(`[Student Attendance] Fetching attendance for month:`, format(month, 'yyyy-MM'));
            
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError) {
                console.error(`[Student Attendance] Auth error:`, userError);
                return;
            }
            
            if (!user) {
                console.error(`[Student Attendance] No authenticated user found`);
                return;
            }
            
            console.log(`[Student Attendance] Current user ID:`, user.id);
            
            const student = await getStudentByAuthId(user.id);
            console.log(`[Student Attendance] Student data:`, student);
            
            if (!student) {
                console.error(`[Student Attendance] No student found for auth ID:`, user.id);
                return;
            }
            
            setStudentInfo(student);
            
            const records = await getStudentAttendanceForMonth(student.id, month);
            console.log(`[Student Attendance] Fetched ${records.length} attendance records:`, records);
            
            setAttendance(records);
        } catch (error) {
            console.error(`[Student Attendance] Error fetching attendance:`, error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendance(currentMonth);
    }, [currentMonth]);

    const navigateMonth = (direction: 'prev' | 'next') => {
        const newMonth = direction === 'prev' 
            ? subMonths(currentMonth, 1) 
            : addMonths(currentMonth, 1);
        setCurrentMonth(newMonth);
    };

    const renderCalendarDays = () => {
        const monthStart = startOfMonth(currentMonth);
        const daysInMonth = getDaysInMonth(currentMonth);
        const firstDayOfWeek = monthStart.getDay(); // 0 for Sunday, 1 for Monday etc.
        const today = new Date();

        const calendarDays = [];
        
        // Add empty cells for days before the 1st of the month
        // Adjust for Monday start (0=Sunday, 1=Monday, etc.)
        const emptyDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
        for (let i = 0; i < emptyDays; i++) {
            calendarDays.push(<div key={`empty-${i}`} className="h-10"></div>);
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const dayOfWeek = date.getDay();
            const formattedDate = format(date, 'yyyy-MM-dd');
            
            // Find attendance record for this day
            const record = attendance.find(a => a.date === formattedDate);
            
            console.log(`[Student Attendance] Day ${day} (${formattedDate}):`, {
                record: record ? `${record.status}` : 'no record',
                dayOfWeek,
                isToday: format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'),
                isFuture: date > today
            });

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

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <CardTitle className="flex items-center gap-2 text-primary">
                        <UserCheck className="h-6 w-6" />
                        My Attendance
                        {studentInfo && (
                            <span className="text-sm font-normal text-muted-foreground">
                                - {studentInfo.class}-{studentInfo.section}
                            </span>
                        )}
                    </CardTitle>
                    <div className="flex items-center gap-2">
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
                            disabled={isLoading || currentMonth >= new Date()}
                             className="h-8 w-8"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
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
