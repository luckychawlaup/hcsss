
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
import { format, getDaysInMonth, startOfMonth, eachDayOfInterval, isSunday } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { getStudentByAuthId } from "@/lib/supabase/students";
import { getAttendanceForStudent, AttendanceRecord } from "@/lib/supabase/attendance";
import { Skeleton } from "../ui/skeleton";

// Example holidays - this should eventually come from a dynamic source
const holidays = ["2024-08-15"];

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

export default function Attendance() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  
  useEffect(() => {
    let channel: any;
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        const user = session?.user;
        if(user) {
            const student = await getStudentByAuthId(user.id);
            if(student) {
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
    });

    return () => {
        authListener.subscription.unsubscribe();
        if(channel) {
            supabase.removeChannel(channel);
        }
    }
  }, [supabase, currentMonth]);


  const monthName = format(currentMonth, "MMMM yyyy");
  
  const allDaysInMonth = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), getDaysInMonth(currentMonth))
  });

  const sundays = allDaysInMonth.filter(d => isSunday(d)).length;
  
  const totalSchoolDays = getDaysInMonth(currentMonth) - sundays - holidays.length;

  const absentDays = attendanceRecords.filter(r => r.status === 'absent');
  const halfDays = attendanceRecords.filter(r => r.status === 'half-day');
  
  const absentDaysCount = absentDays.length + (halfDays.length * 0.5);
  const presentDays = totalSchoolDays > absentDaysCount ? totalSchoolDays - absentDaysCount : 0;
  const attendancePercentage = totalSchoolDays > 0 ? Math.round((presentDays / totalSchoolDays) * 100) : 0;

  const absentDates = absentDays.map(r => format(new Date(r.date), "do MMM"));
  const halfDayDates = halfDays.map(r => format(new Date(r.date), "do MMM"));

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
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-2">
            <p className="text-muted-foreground">Monthly Progress</p>
            <p className="font-bold">{attendancePercentage}%</p>
        </div>
        <Progress value={attendancePercentage} />
        <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
                <h4 className="font-semibold text-sm">Absent Days ({absentDays.length})</h4>
                {absentDays.length > 0 ? (
                    <p className="text-sm text-destructive/80 mt-1">{absentDates.join(", ")}</p>
                ) : (
                    <p className="text-sm text-muted-foreground mt-1">No full-day absences.</p>
                )}
            </div>
             <div>
                <h4 className="font-semibold text-sm">Half Days ({halfDays.length})</h4>
                {halfDays.length > 0 ? (
                    <p className="text-sm text-yellow-600/80 mt-1">{halfDayDates.join(", ")}</p>
                ) : (
                    <p className="text-sm text-muted-foreground mt-1">No half-days taken.</p>
                )}
            </div>
        </div>
         {attendancePercentage < 100 && attendancePercentage > 0 && (
             <p className="text-xs text-center text-muted-foreground mt-4">Total days counted as absent: {absentDaysCount}</p>
         )}
         {attendancePercentage === 100 && (
              <p className="text-sm text-center text-green-600 font-semibold mt-4">Perfect attendance this month. Keep it up!</p>
         )}
      </CardContent>
    </Card>
  );
}
