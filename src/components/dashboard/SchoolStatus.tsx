
"use client";

import { useState, useEffect, useCallback } from "react";
import { isSameDay, getDay } from "date-fns";
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
    try {
      // Fetch holidays first, this is common for all users
      const holidaysUnsubscribe = getHolidays(setHolidays);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const role = await getRole(user);
        if (role === 'student') {
          const studentProfile = await getStudentByAuthId(user.id);
          setStudent(studentProfile);
        }
      }
      return holidaysUnsubscribe;

    } catch (error) {
      console.error("Error fetching data for SchoolStatus:", error);
    } finally {
      // This is the key: ensure loading is set to false after all async operations
      setIsLoading(false);
    }
  }, [supabase]);


  useEffect(() => {
    let unsubscribe: any;
    
    fetchData().then(unsub => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe && typeof unsubscribe.unsubscribe === 'function') {
        unsubscribe.unsubscribe();
      }
    };
  }, [fetchData]);


  if (isLoading) {
    return <Skeleton className="h-12 w-full" />;
  }

  const today = new Date();
  const isSunday = getDay(today) === 0;

  // Check for school-wide holiday (where class_section is null)
  const schoolWideHoliday = holidays.find(h => 
    isSameDay(new Date(h.date), today) && !h.class_section
  );

  // Check for class-specific holiday if user is a student
  const classSpecificHoliday = student 
    ? holidays.find(h => 
        isSameDay(new Date(h.date), today) && 
        h.class_section === `${student.class}-${student.section}`
      )
    : null;

  const todayIsHoliday = schoolWideHoliday || classSpecificHoliday;

  if (todayIsHoliday || isSunday) {
    const holidayReason = todayIsHoliday ? todayIsHoliday.description : "It's Sunday!";
    return (
      <Card className="bg-blue-50 border-blue-200 w-full">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 flex-shrink-0">
            <PartyPopper className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-800 text-sm">School is OFF Today</h3>
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
