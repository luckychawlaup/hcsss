
"use client";

import { useState, useEffect } from "react";
import { format, isSameDay } from "date-fns";
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
    return <Skeleton className="h-16 w-full" />;
  }

  const today = new Date();
  const todayIsHoliday = holidays.find(h => isSameDay(new Date(h.date), today));

  if (todayIsHoliday) {
    return (
      <Card className="bg-blue-500/10 border-blue-500/20">
        <CardContent className="p-4 flex items-center gap-4">
          <PartyPopper className="h-8 w-8 text-blue-600" />
          <div>
            <h3 className="font-bold text-blue-800">School is OFF Today!</h3>
            <p className="text-sm text-blue-700">{todayIsHoliday.description}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-green-500/10 border-green-500/20">
      <CardContent className="p-4 flex items-center gap-4">
        <Building className="h-8 w-8 text-green-600" />
        <div>
          <h3 className="font-bold text-green-800">School is ON Today</h3>
          <p className="text-sm text-green-700">All classes will be held as per the regular schedule.</p>
        </div>
      </CardContent>
    </Card>
  );
}
