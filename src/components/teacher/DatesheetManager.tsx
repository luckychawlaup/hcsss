
"use client";

import { useState, useMemo, useEffect } from "react";
import type { Teacher } from "@/lib/supabase/teachers";
import { getExams, Exam, addExam, updateExam, deleteExam } from "@/lib/supabase/exams";
import { setMarksForStudent, getStudentMarksForExam, Mark, getScheduleForClass } from "@/lib/supabase/marks";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "../ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, BookOpen, FileSignature, PlusCircle, Trash2, X, UserX, Calendar as CalendarIcon, Check, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format as formatDate } from 'date-fns';
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

interface Student {
    id: string;
    name: string;
    class: string;
    section: string;
}

const createExamSchema = z.object({
  name: z.string().min(3, "Exam name must be at least 3 characters."),
  start_date: z.date({ required_error: "Start date is required" }),
  end_date: z.date({ required_error: "End date is required" }),
}).refine((data) => data.end_date >= data.start_date, {
  message: "End date must be on or after start date",
  path: ["end_date"],
});

interface SubjectEntry {
    id: string;
    subject: string;
    exam_date?: Date;
}

interface DatesheetManagerProps {
  teacher: Teacher | null;
}

export default function DatesheetManager({ teacher }: DatesheetManagerProps) {
    const [exams, setExams] = useState<Exam[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [subjects, setSubjects] = useState<SubjectEntry[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFetchingSubjects, setIsFetchingSubjects] = useState(false);
    const [isCreateExamOpen, setIsCreateExamOpen] = useState(false);
    const [isCreatingExam, setIsCreatingExam] = useState(false);
    const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [examToEdit, setExamToEdit] = useState<Exam | null>(null);
    
    const { toast } = useToast();
    const classTeacherClass = teacher?.role === 'classTeacher' ? teacher.class_teacher_of : null;

    useEffect(() => {
        const unsubscribe = getExams(setExams);
        return () => {
            if (unsubscribe && typeof unsubscribe.unsubscribe === 'function') {
                unsubscribe.unsubscribe();
            }
        };
    }, []);
    
    useEffect(() => {
        if (selectedExam && classTeacherClass) {
            setIsFetchingSubjects(true);
            getScheduleForClass(selectedExam.id, classTeacherClass)
              .then(schedule => {
                  if (schedule && schedule.length > 0) {
                       const initialSubjects = schedule.map(mark => ({
                            id: mark.subject,
                            subject: mark.subject,
                            exam_date: mark.exam_date ? new Date(mark.exam_date) : undefined
                        }));
                        setSubjects(initialSubjects);
                  } else {
                       const defaultSubjects = teacher?.qualifications?.length ? teacher.qualifications : ["English", "Hindi", "Maths", "Science", "Social Science"];
                       setSubjects(defaultSubjects.map(sub => ({ id: sub, subject: sub, exam_date: undefined })));
                  }
              })
              .finally(() => {
                  setIsFetchingSubjects(false);
              });
        } else {
            setSubjects([]);
        }
    }, [selectedExam, classTeacherClass, teacher?.qualifications]);
    
    const handleAddSubject = () => {
        const newId = `new-subject-${Date.now()}`;
        setSubjects(prev => [...prev, { id: newId, subject: "", exam_date: undefined }]);
    };
    
    const handleRemoveSubject = (id: string) => {
        setSubjects(prev => prev.filter(s => s.id !== id));
    };

    const handleSubjectNameChange = (id: string, newName: string) => {
        setSubjects(prev => prev.map(s => s.id === id ? { ...s, subject: newName } : s));
    };
    
    const handleDateChange = (id: string, date: Date | undefined) => {
        setSubjects(prev => prev.map(s => s.id === id ? { ...s, exam_date: date } : s));
    };

    const handleSubmit = async () => {
        if (!selectedExam || !classTeacherClass || subjects.length === 0) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please select an exam and add subjects." });
            return;
        }

        const scheduleData = subjects.map(s => ({
            subject: s.subject.trim(),
            marks: 0,
            max_marks: 100,
            exam_date: s.exam_date
        })).filter(s => s.subject !== "");

        if (scheduleData.some(s => !s.exam_date)) {
            toast({ variant: "destructive", title: "Missing Dates", description: "Please assign a date to all subjects." });
            return;
        }
        
        setIsSubmitting(true);
        try {
            const { data: studentsInClass, error: studentError } = await supabase
                .from('students')
                .select('id')
                .eq('class', classTeacherClass.split('-')[0])
                .eq('section', classTeacherClass.split('-')[1]);

            if (studentError) throw studentError;

            if (studentsInClass && studentsInClass.length > 0) {
                const savePromises = studentsInClass.map(student => 
                    setMarksForStudent(student.id, selectedExam.id, scheduleData)
                );
                await Promise.all(savePromises);
                toast({ title: "Datesheet Saved!", description: `The schedule for ${selectedExam.name} has been saved for all students in ${classTeacherClass}.` });
            } else {
                 await setMarksForStudent('placeholder-student', selectedExam.id, scheduleData);
                 toast({ title: "Datesheet Template Saved!", description: `The schedule for ${selectedExam.name} has been saved. It will be applied to new students in ${classTeacherClass}.` });
            }
        } catch (error) {
            console.error("Error saving datesheet:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to save the datesheet." });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // ... The rest of the component
}
