
"use client";

import { useState, useMemo, useEffect } from "react";
import type { Teacher } from "@/lib/supabase/teachers";
import { getExams, Exam } from "@/lib/supabase/exams";
import { setMarksForStudent, getScheduleForClass } from "@/lib/supabase/marks";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Users, PlusCircle, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";

const classes = ["Nursery", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const sections = ["A", "B", "C", "D"];
const allClassSections = classes.flatMap(c => sections.map(s => `${c}-${s}`));


interface DatesheetManagerProps {
  teacher: Teacher | null;
  isPrincipalView?: boolean;
}

export default function DatesheetManager({ teacher, isPrincipalView = false }: DatesheetManagerProps) {
    const [exams, setExams] = useState<Exam[]>([]);
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [schedule, setSchedule] = useState<{ subject: string; exam_date: Date | null }[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const assignedClasses = useMemo(() => {
        if (isPrincipalView) return allClassSections;
        if (!teacher) return [];
        const classes = new Set<string>();
        if (teacher.class_teacher_of) classes.add(teacher.class_teacher_of);
        if (teacher.classes_taught) teacher.classes_taught.forEach(c => classes.add(c));
        return Array.from(classes).sort();
    }, [teacher, isPrincipalView]);

    useEffect(() => {
        const unsubscribe = getExams(exams => {
            const sortedExams = exams.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setExams(sortedExams);
        });
        return () => {
            if (unsubscribe && typeof unsubscribe.unsubscribe === 'function') {
                unsubscribe.unsubscribe();
            }
        };
    }, []);

    useEffect(() => {
        if (selectedClass && selectedExam) {
            getScheduleForClass(selectedExam.id, selectedClass).then(existingSchedule => {
                if (existingSchedule && existingSchedule.length > 0) {
                     setSchedule(existingSchedule.map(s => ({
                        subject: s.subject,
                        exam_date: s.exam_date ? new Date(s.exam_date) : null
                    })));
                } else {
                    setSchedule([]);
                }
            });
        }
    }, [selectedClass, selectedExam]);

    const handleSubjectChange = (index: number, subject: string) => {
        const newSchedule = [...schedule];
        newSchedule[index].subject = subject;
        setSchedule(newSchedule);
    };

    const handleDateChange = (index: number, date: Date | undefined) => {
        if (!date) return;
        const newSchedule = [...schedule];
        newSchedule[index].exam_date = date;
        setSchedule(newSchedule);
    };

    const addSubjectRow = () => {
        setSchedule([...schedule, { subject: "", exam_date: new Date() }]);
    };

    const removeSubjectRow = (index: number) => {
        const newSchedule = [...schedule];
        newSchedule.splice(index, 1);
        setSchedule(newSchedule);
    };
    
    const handleSubmit = async () => {
        if (!selectedClass || !selectedExam || schedule.length === 0) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please select an exam, a class, and add at least one subject." });
            return;
        }

        const validSchedule = schedule.filter(s => s.subject.trim() && s.exam_date);
        if (validSchedule.length !== schedule.length) {
             toast({ variant: "destructive", title: "Incomplete Details", description: "Please ensure every subject has a name and a date." });
            return;
        }

        setIsSubmitting(true);
        try {
            const marksData = validSchedule.map(s => ({
                subject: s.subject,
                marks: 0, // Default marks, will be updated later
                max_marks: 100, // Default max marks
                exam_date: s.exam_date!
            }));
            await setMarksForStudent(selectedClass, selectedExam.id, marksData);
            toast({ title: "Datesheet Saved!", description: `Schedule for ${selectedClass} has been successfully saved.` });
        } catch (error) {
            console.error("Error saving datesheet:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to save the datesheet." });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users />Select Class & Exam</CardTitle>
                    <CardDescription>Choose the class and exam for which you want to manage the datesheet.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select onValueChange={val => setSelectedExam(exams.find(e => e.id === val) || null)}>
                            <SelectTrigger><SelectValue placeholder="Select Exam" /></SelectTrigger>
                            <SelectContent>
                                {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                         <Select onValueChange={setSelectedClass} disabled={assignedClasses.length === 0}>
                            <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                            <SelectContent>
                                {assignedClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {selectedClass && selectedExam && (
                <Card>
                    <CardHeader>
                        <CardTitle>Exam Schedule for {selectedClass}</CardTitle>
                        <CardDescription>Add subjects and their exam dates for the {selectedExam.name}.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {schedule.map((item, index) => (
                            <div key={index} className="flex gap-2 items-center">
                                <Input
                                    placeholder="Subject Name"
                                    value={item.subject}
                                    onChange={(e) => handleSubjectChange(index, e.target.value)}
                                />
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("w-[240px] justify-start text-left font-normal", !item.exam_date && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {item.exam_date ? format(item.exam_date, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={item.exam_date || undefined} onSelect={(date) => handleDateChange(index, date)} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                <Button variant="destructive" size="icon" onClick={() => removeSubjectRow(index)}><Trash2 /></Button>
                            </div>
                        ))}
                         <Button variant="outline" onClick={addSubjectRow}><PlusCircle className="mr-2" />Add Subject</Button>
                    </CardContent>
                     <div className="p-6 pt-0">
                        <Button onClick={handleSubmit} disabled={isSubmitting || schedule.length === 0} className="w-full">
                            {isSubmitting ? <><Loader2 className="mr-2" />Saving...</> : <><Save className="mr-2" />Save Datesheet</>}
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );
}
