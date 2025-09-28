
"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getStudentByAuthId } from "@/lib/supabase/students";
import { getStudentAttendanceForMonth, AttendanceRecord } from "@/lib/supabase/attendance";
import { format, getDaysInMonth, startOfMonth } from "date-fns";
import { Loader2 } from "lucide-react";

type DayStatus = 'present' | 'absent' | 'half-day' | 'sunday' | 'future' | 'unmarked' | 'holiday';

const DayCell = ({ day, status }: { day: number, status: DayStatus }) => {
    const statusClasses: Record<DayStatus, string> = {
        present: "bg-green-500 text-white",
        absent: "bg-red-500 text-white",
        "half-day": "bg-yellow-500 text-white",
        sunday: "bg-muted text-muted-foreground",
        future: "bg-secondary text-secondary-foreground",
        unmarked: "bg-gray-200 text-gray-500",
        holiday: "bg-blue-500 text-white",
    }
    return (
        <div className={cn("flex items-center justify-center h-10 w-10 rounded-full text-sm font-semibold", statusClasses[status])}>
            {day}
        </div>
    )
}

export default function Attendance() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchAttendance = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const student = await getStudentByAuthId(user.id);
        if (student) {
          const records = await getStudentAttendanceForMonth(student.id, currentMonth);
          setAttendance(records);
        }
      }
      setIsLoading(false);
    };
    fetchAttendance();
  }, [currentMonth, supabase]);

  const renderCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDayOfWeek = monthStart.getDay(); // 0 for Sunday, 1 for Monday etc.
    const today = new Date();

    const calendarDays = [];
    
    // Add empty cells for days before the 1st of the month
    for (let i = 0; i < (firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1); i++) {
        calendarDays.push(<div key={`empty-${i}`}></div>);
    }
    
    for(let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const dayOfWeek = date.getDay();
        const record = attendance.find(a => new Date(a.date).getDate() === day);

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
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
             <CardTitle className="flex items-center gap-2 text-primary">
                <UserCheck className="h-6 w-6" />
                Attendance
            </CardTitle>
             <p className="font-bold text-lg">{format(currentMonth, 'MMMM yyyy')}</p>
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
              <div className="flex justify-center items-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin" />
              </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {renderCalendarDays()}
            </div>
          )}
      </CardContent>
    </Card>
  );
}
