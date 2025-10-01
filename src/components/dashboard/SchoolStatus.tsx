
"use client";

import { useState, useEffect } from "react";
import { format, isSameDay, getDay } from "date-fns";
import { getHolidays } from "@/lib/supabase/holidays";
import type { Holiday } from "@/lib/supabase/holidays";
import { Card, CardContent } from "@/components/ui/card";
import { Building, PartyPopper } from "lucide-react";
import { Skeleton } from "../ui/skeleton";

export default function SchoolStatus() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = getHolidays((holidayRecords) => {
      setHolidays(holidayRecords);
      setIsLoading(false);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe.unsubscribe();
      }
    };
  }, []);

  if (isLoading) {
    return <Skeleton className="h-14 w-full" />;
  }

  const today = new Date();
  const todayIsHoliday = holidays.find(h => isSameDay(new Date(h.date), today));
  const isSunday = getDay(today) === 0;

  if (todayIsHoliday || isSunday) {
    return (
      <Card className="bg-blue-50 border-blue-200 w-full">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <PartyPopper className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-800 text-sm">School is OFF Today</h3>
            <p className="text-xs text-blue-700">
              {todayIsHoliday ? todayIsHoliday.description : "It's Sunday!"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-green-50 border-green-200 w-full">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
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
