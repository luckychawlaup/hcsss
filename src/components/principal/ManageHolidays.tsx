
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

  const handleDayClick = (day: Date) => {
    const isAlreadySelected = selectedDays.some(d => isSameDay(d, day));
    if (isAlreadySelected) {
      setSelectedDays(selectedDays.filter(d => !isSameDay(d, day)));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };
  
  const handleSaveHolidays = async () => {
    const existingHolidays = holidays.map(h => format(h, 'yyyy-MM-dd'));
    const selectedHolidayStrings = selectedDays.map(d => format(d, 'yyyy-MM-dd'));

    const toAdd = selectedDays.filter(d => !existingHolidays.includes(format(d, 'yyyy-MM-dd')));
    const toRemove = holidays.filter(h => !selectedHolidayStrings.includes(format(h, 'yyyy-MM-dd')));

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
      setSelectedDays([]); // Clear selection after save
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not save the holiday changes."
      });
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
      backgroundColor: 'var(--primary)',
      color: 'white',
      borderRadius: '50%',
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardContent className="p-4 flex flex-col items-center gap-4">
        <p className="text-muted-foreground">Select dates on the calendar to mark them as holidays. Previously marked holidays are shown in red. New selections are in your primary color.</p>
        <DayPicker
          mode="multiple"
          min={0}
          selected={selectedDays}
          onSelect={(days) => setSelectedDays(days || [])}
          modifiers={modifiers}
          modifiersStyles={modifiersStyles}
        />
        <Button onClick={handleSaveHolidays} disabled={selectedDays.length === 0 && holidays.length === 0}>
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}
