
"use client";

import { useState, useEffect, useCallback } from "react";
import { isSameDay, getDay, startOfDay, format, parseISO } from "date-fns";
import { getHolidays } from "@/lib/supabase/holidays";
import type { Holiday } from "@/lib/supabase/holidays";
import { getStudentByAuthId, Student } from "@/lib/supabase/students";
import { getRole } from "@/lib/getRole";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Building, PartyPopper } from "lucide-react";
import { Skeleton } from "../ui/skeleton";

export default function SchoolStatus() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const holidaysPromise = new Promise<Holiday[]>(resolve => {
        const unsub = getHolidays(holidayData => {
          resolve(holidayData);
          if (unsub && typeof unsub.unsubscribe === 'function') {
            unsub.unsubscribe();
          }
        });
      });

      const [holidayData, role] = await Promise.all([
        holidaysPromise,
        getRole(user)
      ]);
      
      setHolidays(holidayData);

      if (role === 'student' && user) {
        const studentProfile = await getStudentByAuthId(user.id);
        setStudent(studentProfile);
      }
    } catch (error) {
      console.error("Error fetching data for SchoolStatus:", error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);


  useEffect(() => {
    fetchData();
  }, [fetchData]);


  if (isLoading) {
    return <Skeleton className="h-12 w-full" />;
  }

  const today = startOfDay(new Date());
  const isSunday = getDay(today) === 0;

  // Check for school-wide holiday (where class_section is null)
  const schoolWideHoliday = holidays.find(h => 
    isSameDay(startOfDay(parseISO(h.date)), today) && !h.class_section
  );

  // Check for class-specific holiday if user is a student
  const classSpecificHoliday = student 
    ? holidays.find(h => 
        isSameDay(startOfDay(parseISO(h.date)), today) && 
        h.class_section === `${student.class}-${student.section}`
      )
    : null;

  const todayIsHoliday = schoolWideHoliday || classSpecificHoliday;
  
  if (todayIsHoliday || isSunday) {
    let holidayReason = isSunday ? "It's Sunday!" : todayIsHoliday!.description;
    let holidayTitle = "School is OFF";
    let dateRangeString = "";

    if (todayIsHoliday) {
        const relevantHolidays = holidays.filter(h => h.description === todayIsHoliday.description && h.class_section === todayIsHoliday.class_section)
            .map(h => startOfDay(parseISO(h.date)))
            .sort((a,b) => a.getTime() - b.getTime());
        
        if (relevantHolidays.length > 1) {
            const firstDay = relevantHolidays[0];
            const lastDay = relevantHolidays[relevantHolidays.length - 1];
            dateRangeString = ` (from ${format(firstDay, 'MMM d')} to ${format(lastDay, 'MMM d')})`;
        }
    }


    return (
      <Card className="bg-blue-50 border-blue-200 w-full">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 flex-shrink-0">
            <PartyPopper className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-800 text-sm">{holidayTitle}{dateRangeString}</h3>
            <p className="text-xs text-blue-700">
              {holidayReason}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-green-50 border-green-200 w-full">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600 flex-shrink-0">
          <Building className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-green-800 text-sm">School is ON Today</h3>
          <p className="text-xs text-green-700">All classes will be held as per the regular schedule.</p>
        </div>
      </CardContent>
    </Card>
  );
}
