
"use client";

import { useState, useEffect } from "react";
import { format, isSameDay } from "date-fns";
import { DayPicker } from "react-day-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getHolidays, addHoliday, deleteHoliday, Holiday } from "@/lib/supabase/holidays";
import type { DateRange } from "react-day-picker";
import { Loader2 } from "lucide-react";

export default function ManageHolidays() {
  const [holidays, setHolidays] = useState<Date[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState<Date[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = getHolidays((holidayRecords) => {
      setHolidays(holidayRecords.map(h => new Date(h.date)));
      setIsLoading(false);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe.unsubscribe();
      }
    };
  }, []);

  const handleSaveHolidays = async () => {
    const existingHolidayStrings = holidays.map(h => format(h, 'yyyy-MM-dd'));
    
    // Find dates to add
    const toAdd = selectedDays.filter(d => !existingHolidayStrings.includes(format(d, 'yyyy-MM-dd')));
    
    // Find dates to remove
    const toRemove = holidays.filter(h => !selectedDays.some(d => isSameDay(d, h)));
    
    setIsLoading(true);
    try {
      if (toAdd.length > 0) {
        await Promise.all(toAdd.map(date => addHoliday({ date: format(date, 'yyyy-MM-dd'), description: "Holiday" })));
      }
      if (toRemove.length > 0) {
        await Promise.all(toRemove.map(date => deleteHoliday(format(date, 'yyyy-MM-dd'))));
      }
      toast({
        title: "Holidays Updated",
        description: "The holiday schedule has been successfully updated."
      });
      // The real-time subscription will update the 'holidays' state automatically
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not save the holiday changes."
      });
    } finally {
       setIsLoading(false);
    }
  };

  const modifiers = {
    holiday: holidays,
    selected: selectedDays,
  };

  const modifiersStyles = {
    holiday: {
      backgroundColor: 'var(--destructive)',
      color: 'white',
      borderRadius: '50%',
    },
    selected: {
        border: '2px solid var(--primary)',
        borderRadius: '50%',
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardContent className="p-4 flex flex-col items-center gap-4">
        <p className="text-muted-foreground">Select dates on the calendar to mark them as holidays. Existing holidays are in red.</p>
        <DayPicker
          mode="multiple"
          min={0}
          selected={selectedDays}
          onSelect={(days) => setSelectedDays(days || [])}
          modifiers={modifiers}
          modifiersStyles={modifiersStyles}
          onDayClick={(day, modifiers) => {
              if (modifiers.holiday) {
                  setSelectedDays(prev => prev.filter(d => !isSameDay(d, day)))
              } else {
                  setSelectedDays(prev => [...prev, day]);
              }
          }}
        />
        <Button onClick={handleSaveHolidays} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2" />}
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}
