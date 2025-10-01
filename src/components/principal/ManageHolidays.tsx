
"use client";

import { useState, useEffect } from "react";
import { format, isSameDay } from "date-fns";
import { DayPicker, SelectSingleEventHandler } from "react-day-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getHolidays, addHoliday, deleteHoliday, Holiday } from "@/lib/supabase/holidays";
import { Loader2, Calendar, Plus, Trash2, CalendarCheck } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import type { Teacher } from "@/lib/supabase/teachers";

const classes = ["Nursery", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const sections = ["A", "B", "C", "D"];
const allClassSections = classes.flatMap(c => sections.map(s => `${c}-${s}`));

interface ManageHolidaysProps {
  teacher?: Teacher | null; // Optional: For Class Teacher view
}

export default function ManageHolidays({ teacher }: ManageHolidaysProps) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());
  const [description, setDescription] = useState("");
  const [isForAll, setIsForAll] = useState(true);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  
  const isPrincipalView = !teacher;
  const classTeacherClass = teacher?.role === 'classTeacher' ? teacher.class_teacher_of : null;


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
  
  const handleDayClick: SelectSingleEventHandler = (day) => {
    setSelectedDay(day);
  };

  const handleAddHoliday = async () => {
    if (!selectedDay || !description) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please select a date and enter a description." });
      return;
    }
    
    setIsSubmitting(true);
    try {
        const holidayDate = format(selectedDay, 'yyyy-MM-dd');
        
        // Principal/Owner View
        if (isPrincipalView) {
            if (isForAll) {
                 await addHoliday({ date: holidayDate, description, class_section: null });
                 toast({ title: "Holiday Added", description: `A school-wide holiday has been declared on ${holidayDate}.` });
            } else {
                 const promises = selectedClasses.map(cs => addHoliday({ date: holidayDate, description, class_section: cs }));
                 await Promise.all(promises);
                 toast({ title: "Holidays Added", description: `Holiday declared for ${selectedClasses.length} classes.` });
            }
        } else if (classTeacherClass) {
            // Class Teacher View
            await addHoliday({ date: holidayDate, description, class_section: classTeacherClass });
            toast({ title: "Holiday Added", description: `A holiday for your class has been declared on ${holidayDate}.` });
        }
        
        setDescription("");
        setSelectedClasses([]);
        
    } catch (error) {
        toast({ variant: "destructive", title: "Failed to Add Holiday", description: "This date may already be marked as a holiday." });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleDeleteHoliday = async (id: string) => {
    await deleteHoliday(id);
    toast({ title: "Holiday Removed" });
  }

  const holidaysOnSelectedDay = selectedDay 
    ? holidays.filter(h => isSameDay(new Date(h.date), selectedDay!))
    : [];

  const modifiers = {
    holiday: holidays.map(h => new Date(h.date)),
  };

  const modifiersStyles = {
    holiday: {
      backgroundColor: 'var(--destructive)',
      color: 'white',
      borderRadius: '9999px',
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col items-center">
            <h3 className="font-semibold text-lg mb-4">Select a Date</h3>
            <DayPicker
                mode="single"
                selected={selectedDay}
                onSelect={handleDayClick}
                modifiers={modifiers}
                modifiersStyles={modifiersStyles}
                className="rounded-md border"
            />
             <div className="mt-4 text-sm text-center text-muted-foreground p-2 bg-secondary rounded-md">
                Dates marked in red are holidays.
             </div>
        </div>
        <div className="space-y-4">
             <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2"><CalendarCheck/> Manage Holiday for {selectedDay ? format(selectedDay, 'PPP') : '...'}</h3>
                 <div className="space-y-4 p-4 border rounded-lg">
                    <div className="space-y-1">
                        <Label htmlFor="description">Holiday Description</Label>
                        <Input 
                            id="description" 
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="e.g., Diwali" 
                        />
                    </div>

                    {isPrincipalView && (
                        <div className="flex items-center space-x-2">
                            <Checkbox id="isForAll" checked={isForAll} onCheckedChange={(checked) => setIsForAll(Boolean(checked))} />
                            <Label htmlFor="isForAll">Declare for entire school</Label>
                        </div>
                    )}
                    
                    {isPrincipalView && !isForAll && (
                        <div className="space-y-2 pt-2 border-t">
                            <Label>Select Classes</Label>
                            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                                {allClassSections.map(cs => (
                                    <div key={cs} className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={`class-${cs}`}
                                            checked={selectedClasses.includes(cs)}
                                            onCheckedChange={(checked) => {
                                                setSelectedClasses(prev => checked ? [...prev, cs] : prev.filter(c => c !== cs));
                                            }}
                                        />
                                        <Label htmlFor={`class-${cs}`}>{cs}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <Button onClick={handleAddHoliday} disabled={isSubmitting} className="w-full">
                        {isSubmitting ? <Loader2 className="mr-2 animate-spin"/> : <Plus className="mr-2"/>}
                        Declare Holiday
                    </Button>
                </div>
            </div>

            {holidaysOnSelectedDay.length > 0 && (
                <div>
                     <h3 className="font-semibold text-lg mb-2">Declared Holidays on this Date</h3>
                    <div className="space-y-2">
                        {holidaysOnSelectedDay.map(h => (
                            <div key={h.id} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                                <div>
                                    <p className="font-medium">{h.description}</p>
                                    <p className="text-xs text-muted-foreground">{h.class_section || "School-wide"}</p>
                                </div>
                                 <Button variant="ghost" size="icon" onClick={() => handleDeleteHoliday(h.id!)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
