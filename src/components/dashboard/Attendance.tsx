
"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { UserCheck } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, getDaysInMonth, startOfMonth, eachDayOfInterval } from "date-fns";

// Mock data for demonstration
const mockAttendanceData = {
  "2024-08-05": "absent",
  "2024-08-12": "absent",
  "2024-08-23": "absent",
};

const holidays = ["2024-08-15"]; // Example holiday

export default function Attendance() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthName = format(currentMonth, "MMMM yyyy");
  
  const allDaysInMonth = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), getDaysInMonth(currentMonth))
  });

  const sundays = allDaysInMonth.filter(d => d.getDay() === 0).length;
  
  const totalSchoolDays = getDaysInMonth(currentMonth) - sundays - holidays.length;
  const absentDaysCount = Object.keys(mockAttendanceData).length;
  const presentDays = totalSchoolDays - absentDaysCount;
  const attendancePercentage = totalSchoolDays > 0 ? Math.round((presentDays / totalSchoolDays) * 100) : 0;

  const absentDates = Object.keys(mockAttendanceData).map(dateStr => format(new Date(dateStr), "do MMM"));

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
        <div className="mt-4">
            <h4 className="font-semibold text-sm">Absent Days ({absentDaysCount})</h4>
            {absentDaysCount > 0 ? (
                 <p className="text-sm text-destructive/80 mt-1">{absentDates.join(", ")}</p>
            ) : (
                <p className="text-sm text-muted-foreground mt-1">No absences this month. Great job!</p>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
