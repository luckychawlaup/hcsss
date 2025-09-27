
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { UserCheck } from "lucide-react";
import { format, getDaysInMonth, startOfMonth, eachDayOfInterval, isSunday, isAfter, startOfToday, getDay } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { getStudentByAuthId } from "@/lib/supabase/students";
import { getAttendanceForStudent, AttendanceRecord } from "@/lib/supabase/attendance";
import { Skeleton } from "../ui/skeleton";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

function AttendanceSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-1/2" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
            </CardContent>
        </Card>
    )
}

const DayCell = ({ day, status }: { day: number, status: 'present' | 'absent' | 'half-day' | 'sunday' | 'future' | 'unmarked' }) => {
    const statusClasses = {
        present: "bg-green-500 text-white",
        absent: "bg-red-500 text-white",
        "half-day": "bg-yellow-500 text-white",
        sunday: "bg-muted text-muted-foreground",
        future: "bg-secondary text-secondary-foreground",
        unmarked: "bg-red-500/20 text-red-700",
    }
    return (
        <div className={cn("flex items-center justify-center h-10 w-10 rounded-full text-sm font-semibold", statusClasses[status])}>
            {day}
        </div>
    )
}

export default function Attendance() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | undefined;

    const setupSubscription = async () => {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            const student = await getStudentByAuthId(user.id);
            if (student) {
                if (channel) {
                    supabase.removeChannel(channel);
                    channel = undefined;
                }
                
                channel = getAttendanceForStudent(student.id, currentMonth, (records) => {
                    setAttendanceRecords(records || []);
                    setIsLoading(false);
                });

            } else {
                setIsLoading(false);
            }
        } else {
            setIsLoading(false);
        }
    };

    setupSubscription();

    return () => {
        if (channel) {
            supabase.removeChannel(channel);
        }
    };
  }, [currentMonth]);


  const monthName = format(currentMonth, "MMMM yyyy");
  
  const allDaysInMonth = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), getDaysInMonth(currentMonth))
  });
  
  const today = startOfToday();

  // Exclude Sundays and future days for percentage calculation
  const pastSchoolDays = allDaysInMonth.filter(day => 
      !isSunday(day) &&
      !isAfter(day, today)
  );
  
  const totalPastSchoolDays = pastSchoolDays.length;

  const presentDaysCount = attendanceRecords.filter(r => r.status === 'present').length;
  const halfDaysCount = attendanceRecords.filter(r => r.status === 'half-day').length;
  
  const effectivePresentDays = presentDaysCount + (halfDaysCount * 0.5);
  
  const attendancePercentage = totalPastSchoolDays > 0 
      ? Math.round((effectivePresentDays / totalPastSchoolDays) * 100) 
      : 100;

  const firstDayOfMonth = startOfMonth(currentMonth);
  const startingDayOfWeek = getDay(firstDayOfMonth) === 0 ? 6 : getDay(firstDayOfMonth) - 1; // Monday is 0

  const calendarDays = Array.from({ length: startingDayOfWeek }, (_, i) => <div key={`empty-${i}`}/>);
  
  allDaysInMonth.forEach(day => {
    const date = day.getDate();
    let status: 'present' | 'absent' | 'half-day' | 'sunday' | 'future' | 'unmarked' = 'future';

    if (isSunday(day)) {
      status = 'sunday';
    } else if (isAfter(day, today)) {
      status = 'future';
    } else {
      const record = attendanceRecords.find(r => format(new Date(r.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'));
      if (record) {
        status = record.status;
      } else {
        status = 'unmarked'; // Unmarked past day
      }
    }
    
    calendarDays.push(<DayCell key={date} day={date} status={status} />);
  })

  if (isLoading) {
      return <AttendanceSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
             <CardTitle className="flex items-center gap-2 text-primary">
                <UserCheck className="h-6 w-6" />
                Attendance
            </CardTitle>
             <p className="font-bold text-lg">{monthName}</p>
        </div>
        <div className="flex items-center justify-between pt-4">
            <p className="text-muted-foreground text-sm">Monthly Attendance</p>
            <p className="font-bold text-lg">{attendancePercentage}%</p>
        </div>
        <Progress value={attendancePercentage} className="mt-1 h-2"/>
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
          <div className="grid grid-cols-7 gap-2">
            {calendarDays}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-xs">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500"/> Present</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"/> Absent</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500/20"/> Unmarked</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-yellow-500"/> Half-day</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-muted"/> Sunday</div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">Unmarked past school days are counted as absent.</p>
      </CardContent>
    </Card>
  );
}
