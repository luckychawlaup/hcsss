
"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { UserCheck } from "lucide-react";
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
  const monthName = "September 2025"; 

  const calendarDays = [
    <div key="empty-1"></div>,
    <DayCell key={1} day={1} status="present" />,
    <DayCell key={2} day={2} status="present" />,
    <DayCell key={3} day={3} status="present" />,
    <DayCell key={4} day={4} status="present" />,
    <DayCell key={5} day={5} status="present" />,
    <DayCell key={6} day={6} status="sunday" />,
    <DayCell key={7} day={7} status="present" />,
    <DayCell key={8} day={8} status="absent" />,
    <DayCell key={9} day={9} status="present" />,
    <DayCell key={10} day={10} status="present" />,
    <DayCell key={11} day={11} status="present" />,
    <DayCell key={12} day={12} status="present" />,
    <DayCell key={13} day={13} status="sunday" />,
    <DayCell key={14} day={14} status="present" />,
    <DayCell key={15} day={15} status="present" />,
    <DayCell key={16} day={16} status="half-day" />,
    <DayCell key={17} day={17} status="present" />,
    <DayCell key={18} day={18} status="present" />,
    <DayCell key={19} day={19} status="present" />,
    <DayCell key={20} day={20} status="sunday" />,
    <DayCell key={21} day={21} status="present" />,
    <DayCell key={22} day={22} status="present" />,
    <DayCell key={23} day={23} status="present" />,
    <DayCell key={24} day={24} status="present" />,
    <DayCell key={25} day={25} status="future" />,
    <DayCell key={26} day={26} status="future" />,
    <DayCell key={27} day={27} status="sunday" />,
    <DayCell key={28} day={28} status="future" />,
    <DayCell key={29} day={29} status="future" />,
    <DayCell key={30} day={30} status="future" />,
  ];

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
