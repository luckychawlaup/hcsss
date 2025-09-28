
"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { UserCheck } from "lucide-react";
import { format, getDaysInMonth, startOfMonth, eachDayOfInterval, isSunday, isAfter, startOfToday, getDay, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";

const DayCell = ({ day, status }: { day: number, status: 'present' | 'absent' | 'half-day' | 'sunday' | 'future' | 'unmarked' | 'holiday' }) => {
    const statusClasses = {
        present: "bg-green-500 text-white",
        absent: "bg-red-500 text-white",
        "half-day": "bg-yellow-500 text-white",
        sunday: "bg-muted text-muted-foreground",
        future: "bg-secondary text-secondary-foreground",
        unmarked: "bg-red-500/20 text-red-700",
        holiday: "bg-blue-500/20 text-blue-700",
    }
    return (
        <div className={cn("flex items-center justify-center h-10 w-10 rounded-full text-sm font-semibold", statusClasses[status])}>
            {day}
        </div>
    )
}

export default function Attendance() {
  const currentMonth = new Date();
  const monthName = format(currentMonth, "MMMM yyyy");
  const attendancePercentage = 92; // Dummy data

  const allDaysInMonth = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), getDaysInMonth(currentMonth))
  });
  
  const today = startOfToday();
  const startingDayOfWeek = getDay(startOfMonth(currentMonth)) === 0 ? 6 : getDay(startOfMonth(currentMonth)) - 1; // Monday is 0
  const calendarDays = Array.from({ length: startingDayOfWeek }, (_, i) => <div key={`empty-${i}`}/>);

  const dummyData = [
      'present', 'present', 'present', 'present', 'present', 'sunday',
      'present', 'absent', 'present', 'present', 'present', 'present', 'sunday',
      'present', 'present', 'half-day', 'present', 'present', 'present', 'sunday',
      'present', 'present', 'present', 'present', 'future', 'future', 'sunday',
      'future', 'future', 'future', 'future'
  ];

  allDaysInMonth.forEach(day => {
    const date = day.getDate();
    let status: 'present' | 'absent' | 'half-day' | 'sunday' | 'future' | 'unmarked' | 'holiday' = 'future';
    
    if (isSunday(day)) {
      status = 'sunday';
    } else if (isAfter(day, today)) {
      status = 'future';
    } else {
      status = dummyData[date-1] as 'present' | 'absent' | 'half-day' || 'present';
    }
    
    calendarDays.push(<DayCell key={date} day={date} status={status} />);
  })

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
      </CardContent>
    </Card>
  );
}
