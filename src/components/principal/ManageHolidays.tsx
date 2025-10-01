
"use client";

import { useState, useEffect } from "react";
import { format, eachDayOfInterval } from "date-fns";
import { DayPicker, SelectRangeEventHandler, DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getHolidays, addHoliday, deleteHoliday, Holiday } from "@/lib/supabase/holidays";
import { Loader2, Calendar as CalendarIcon, PlusCircle, Trash2, CalendarOff } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import type { Teacher } from "@/lib/supabase/teachers";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "@/lib/utils";
import { ScrollArea } from "../ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


const classes = ["Nursery", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const sections = ["A", "B", "C", "D"];
const allClassSections = classes.flatMap(c => sections.map(s => `${c}-${s}`));

interface ManageHolidaysProps {
  teacher?: Teacher | null; // Optional: For Class Teacher view
}

export default function ManageHolidays({ teacher }: ManageHolidaysProps) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();
  const [description, setDescription] = useState("");
  const [isForAll, setIsForAll] = useState(true);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);

  const { toast } = useToast();
  
  const isPrincipalView = !teacher;
  const classTeacherClass = teacher?.role === 'classTeacher' ? teacher.class_teacher_of : null;


  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = getHolidays((holidayRecords) => {
      const sortedHolidays = holidayRecords.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setHolidays(sortedHolidays);
      setIsLoading(false);
    });

    return () => {
      if (unsubscribe && typeof unsubscribe.unsubscribe === 'function') {
        unsubscribe.unsubscribe();
      }
    };
  }, []);
  
  const handleRangeSelect: SelectRangeEventHandler = (range) => {
    setSelectedRange(range);
  };

  const handleAddHoliday = async () => {
    if (!selectedRange?.from || !description) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please select a date range and enter a description." });
      return;
    }
    
    setIsSubmitting(true);
    try {
        const holidayDates = eachDayOfInterval({
            start: selectedRange.from,
            end: selectedRange.to || selectedRange.from,
        });

        const holidayPromises = holidayDates.flatMap(holidayDate => {
             const formattedDate = format(holidayDate, 'yyyy-MM-dd');
             if (isPrincipalView) {
                if (isForAll) {
                    return addHoliday({ date: formattedDate, description, class_section: null });
                } else {
                    return selectedClasses.map(cs => addHoliday({ date: formattedDate, description, class_section: cs }));
                }
            } else if (classTeacherClass) {
                return addHoliday({ date: formattedDate, description, class_section: classTeacherClass });
            }
            return [];
        });

        await Promise.all(holidayPromises);

        toast({ title: "Holiday(s) Added", description: `${holidayDates.length} day(s) have been declared as holidays.` });
        
        setDescription("");
        setSelectedClasses([]);
        setSelectedRange(undefined);
        
    } catch (error) {
        toast({ variant: "destructive", title: "Failed to Add Holiday", description: "One or more dates may already be marked as a holiday." });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleDeleteHoliday = async () => {
    if (!holidayToDelete) return;
    await deleteHoliday(holidayToDelete.id!);
    toast({ title: "Holiday Removed" });
    setHolidayToDelete(null);
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarOff/>
                        Declare a New Holiday
                    </CardTitle>
                    <CardDescription>Select a date or range and provide a reason for the holiday.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-1">
                        <Label>Date Range</Label>
                        <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "w-full justify-start text-left font-normal",
                                !selectedRange && "text-muted-foreground"
                            )}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedRange?.from ? (
                                selectedRange.to ? (
                                <>
                                    {format(selectedRange.from, "LLL dd, y")} -{" "}
                                    {format(selectedRange.to, "LLL dd, y")}
                                </>
                                ) : (
                                format(selectedRange.from, "LLL dd, y")
                                )
                            ) : (
                                <span>Pick a date range</span>
                            )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <DayPicker
                                mode="range"
                                selected={selectedRange}
                                onSelect={handleRangeSelect}
                            />
                        </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="description">Holiday Description</Label>
                        <Input 
                            id="description" 
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="e.g., Diwali Break" 
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
                             <ScrollArea className="h-40 rounded-md border">
                                <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-2">
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
                            </ScrollArea>
                        </div>
                    )}
                    <Button onClick={handleAddHoliday} disabled={isSubmitting} className="w-full">
                        {isSubmitting ? <Loader2 className="mr-2 animate-spin"/> : <PlusCircle className="mr-2"/>}
                        Declare Holiday
                    </Button>
                </CardContent>
            </Card>
        </div>
         <div>
            <Card>
                <CardHeader>
                    <CardTitle>Holiday History</CardTitle>
                    <CardDescription>A list of all declared holidays.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[450px] pr-4">
                        <div className="space-y-2">
                            {holidays.length > 0 ? holidays.map(h => (
                                <div key={h.id} className="flex items-center justify-between p-3 bg-secondary rounded-md">
                                    <div>
                                        <p className="font-semibold">{h.description}</p>
                                        <p className="text-sm text-muted-foreground">{format(new Date(h.date), 'EEEE, do MMMM yyyy')}</p>
                                        <p className="text-xs text-muted-foreground">{h.class_section || "School-wide"}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setHolidayToDelete(h)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            )) : (
                                <p className="text-center text-muted-foreground py-8">No holidays declared yet.</p>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
        <AlertDialog open={!!holidayToDelete} onOpenChange={(open) => !open && setHolidayToDelete(null)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the holiday for {holidayToDelete?.description} on {holidayToDelete?.date ? format(new Date(holidayToDelete.date), 'do MMM, yyyy') : ''}. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteHoliday} className="bg-destructive hover:bg-destructive/90">
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
