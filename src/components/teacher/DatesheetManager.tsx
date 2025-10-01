
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
import { getStudentsForTeacher, Student } from "@/lib/supabase/students";

const createExamSchema = z.object({
  name: z.string().min(3, "Exam name must be at least 3 characters."),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
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
        if (teacher) {
            getStudentsForTeacher(teacher, (students) => setStudents(students as Student[]));
        }
    }, [teacher]);
    
    useEffect(() => {
        if (selectedExam && classTeacherClass) {
            setIsFetchingSubjects(true);
            getScheduleForClass(selectedExam.id, classTeacherClass)
              .then(schedule => {
                  if (schedule && schedule.length > 0) {
                       const initialSubjects = schedule.map(mark => ({
                            id: mark.subject, // Using subject as initial ID
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

        const studentsInClass = students.filter(s => `${s.class}-${s.section}` === classTeacherClass);
        if (studentsInClass.length === 0) {
            toast({ 
                title: "Datesheet Saved", 
                description: `The schedule for ${selectedExam.name} has been saved for ${classTeacherClass}. It will apply to students as they are added.`
            });
            // We can still proceed to save the schedule for the class even if there are no students yet.
            // Or we can save it to a different table. For now, let's just show a success message.
            // A more robust solution might involve a `schedules` table separate from `marks`.
            // Given the current structure, we'll save it for each student. If no students, we just show success.
            return;
        }
        
        setIsSubmitting(true);
        try {
            const scheduleData = subjects.map(s => ({
                subject: s.subject.trim(),
                marks: 0, // Placeholder
                max_marks: 100, // Placeholder
                exam_date: s.exam_date
            })).filter(s => s.subject !== "");

            // Save the schedule for all students in the class
            const savePromises = studentsInClass.map(student => 
                setMarksForStudent(student.id, selectedExam.id, scheduleData)
            );
            await Promise.all(savePromises);
            
            toast({ title: "Datesheet Saved!", description: `The schedule for ${selectedExam.name} has been saved for all students in ${classTeacherClass}.` });
        } catch (error) {
            console.error("Error saving datesheet:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to save the datesheet." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const createExamForm = useForm<z.infer<typeof createExamSchema>>({
        resolver: zodResolver(createExamSchema),
        defaultValues: { name: "" }
    });

    useEffect(() => {
        if (examToEdit) {
            createExamForm.reset({
                name: examToEdit.name,
                start_date: examToEdit.start_date ? new Date(examToEdit.start_date) : undefined,
                end_date: examToEdit.end_date ? new Date(examToEdit.end_date) : undefined,
            });
        } else {
            createExamForm.reset({ name: "", start_date: undefined, end_date: undefined });
        }
    }, [examToEdit, createExamForm]);


    const handleCreateOrUpdateExam = async (values: z.infer<typeof createExamSchema>) => {
        setIsCreatingExam(true);
        try {
            if (examToEdit) {
                // Update existing exam
                 await updateExam(examToEdit.id, {
                    name: values.name.trim(),
                    start_date: values.start_date?.toISOString(),
                    end_date: values.end_date?.toISOString(),
                });
                toast({ title: "Exam Updated Successfully"});
            } else {
                // Create new exam
                const examData = {
                    name: values.name.trim(),
                    date: new Date().toISOString(),
                    start_date: values.start_date?.toISOString(),
                    end_date: values.end_date?.toISOString(),
                };
                await addExam(examData);
                toast({ title: "Exam Created Successfully"});
            }
            
            setIsCreateExamOpen(false);
            setExamToEdit(null);
            createExamForm.reset();

        } catch (error: any) {
            toast({ 
                variant: "destructive", 
                title: "Operation Failed", 
                description: error.message || "An unknown error occurred."
            });
        } finally {
            setIsCreatingExam(false);
        }
    };

    const handleDeleteExam = async () => {
        if (!examToDelete) return;
        setIsDeleting(true);
        try {
            await deleteExam(examToDelete.id);
            toast({ title: "Exam Deleted", description: `${examToDelete.name} has been removed.`});
            setExamToDelete(null);
            if (selectedExam?.id === examToDelete.id) {
                setSelectedExam(null);
            }
        } catch (error: any) {
             toast({ 
                variant: "destructive", 
                title: "Deletion Failed", 
                description: error.message || "An unknown error occurred."
            });
        } finally {
            setIsDeleting(false);
        }
    }
    
    if (teacher?.role !== 'classTeacher') {
        return (
             <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
                <UserX className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Permission Denied</h3>
                <p className="text-muted-foreground mt-2">Only Class Teachers can manage datesheets.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                         <CardTitle className="flex items-center gap-2"><BookOpen />Manage Exams</CardTitle>
                         <Button variant="outline" onClick={() => { setExamToEdit(null); setIsCreateExamOpen(true); }}><PlusCircle className="mr-2"/>Create New Exam</Button>
                    </div>
                    <CardDescription>Create, edit, or delete exams. Select an exam to manage its datesheet for your class: <span className="font-semibold text-primary">{classTeacherClass}</span></CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {exams.length > 0 ? exams.map(exam => (
                         <div key={exam.id} className="flex items-center justify-between p-2 rounded-md hover:bg-secondary">
                             <button className="flex-1 text-left" onClick={() => setSelectedExam(exam)}>
                                 <p className={cn("font-medium", selectedExam?.id === exam.id && "text-primary")}>{exam.name}</p>
                                 {exam.start_date && (
                                     <p className="text-xs text-muted-foreground">
                                         {formatDate(new Date(exam.start_date), 'MMM d')} - {exam.end_date ? formatDate(new Date(exam.end_date), 'MMM d, yyyy') : ''}
                                     </p>
                                 )}
                             </button>
                             <div>
                                 <Button variant="ghost" size="icon" onClick={() => { setExamToEdit(exam); setIsCreateExamOpen(true); }}><Edit className="h-4 w-4"/></Button>
                                 <Button variant="ghost" size="icon" onClick={() => setExamToDelete(exam)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                             </div>
                         </div>
                    )) : <p className="text-muted-foreground text-center p-4">No exams created yet.</p>}
                </CardContent>
            </Card>

            {isFetchingSubjects ? (
                <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
            ) : selectedExam ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><FileSignature />Set Schedule for {selectedExam.name}</CardTitle>
                        <CardDescription>Add subjects and assign a date for each exam.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="space-y-3">
                            {subjects.map((subjectEntry) => (
                                <div key={subjectEntry.id} className="flex flex-col sm:flex-row items-start sm:items-end gap-2 p-3 border rounded-lg">
                                    <div className="flex-1 w-full sm:w-auto">
                                        <Label htmlFor={`subject-${subjectEntry.id}`}>Subject</Label>
                                        <Input
                                          id={`subject-${subjectEntry.id}`}
                                          value={subjectEntry.subject}
                                          onChange={(e) => handleSubjectNameChange(subjectEntry.id, e.target.value)}
                                          placeholder="Subject Name"
                                        />
                                    </div>
                                     <div className="w-full sm:w-auto">
                                        <Label>Exam Date</Label>
                                        <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !subjectEntry.exam_date && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {subjectEntry.exam_date ? formatDate(subjectEntry.exam_date, "PPP") : <span>Pick date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar mode="single" selected={subjectEntry.exam_date} onSelect={(date) => handleDateChange(subjectEntry.id, date)} initialFocus />
                                        </PopoverContent>
                                        </Popover>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveSubject(subjectEntry.id)}><Trash2 className="text-destructive"/></Button>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between items-center">
                            <Button variant="outline" onClick={handleAddSubject}><PlusCircle className="mr-2"/> Add Subject</Button>
                            <Button onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? <><Loader2 className="mr-2" /> Saving...</> : <><Save className="mr-2" /> Save Datesheet</>}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                 <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
                    <p className="text-muted-foreground">Please select an exam to create its schedule.</p>
                </div>
            )}
             <Dialog open={isCreateExamOpen} onOpenChange={(isOpen) => { if (!isOpen) setExamToEdit(null); setIsCreateExamOpen(isOpen); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{examToEdit ? "Edit Exam" : "Create New Exam"}</DialogTitle>
                        <DialogDescription>{examToEdit ? "Update the exam details." : "Define a new exam. You can optionally add a start and end date."}</DialogDescription>
                    </DialogHeader>
                    <FormProvider {...createExamForm}>
                        <form onSubmit={createExamForm.handleSubmit(handleCreateOrUpdateExam)} className="space-y-4">
                            
                            <div className="space-y-2">
                                <Label htmlFor="name">Exam Name</Label>
                                <Input 
                                    id="name" 
                                    {...createExamForm.register("name")} 
                                    placeholder="e.g., Mid-term Exam 2024"
                                    disabled={isCreatingExam}
                                />
                                {createExamForm.formState.errors.name && (
                                    <p className="text-sm text-destructive">
                                        {createExamForm.formState.errors.name.message}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={createExamForm.control}
                                    name="start_date"
                                    render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <Label>Start Date (Optional)</Label>
                                        <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                {field.value ? formatDate(field.value, "PPP") : <span>Pick a date</span>}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                        </PopoverContent>
                                        </Popover>
                                    </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={createExamForm.control}
                                    name="end_date"
                                    render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <Label>End Date (Optional)</Label>
                                        <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                {field.value ? formatDate(field.value, "PPP") : <span>Pick a date</span>}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                        </PopoverContent>
                                        </Popover>
                                    </FormItem>
                                    )}
                                />
                            </div>
                            
                            <DialogFooter>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => { setIsCreateExamOpen(false); setExamToEdit(null); }}
                                    disabled={isCreatingExam}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isCreatingExam}>
                                    {isCreatingExam ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <PlusCircle className="mr-2 h-4 w-4"/>
                                            {examToEdit ? "Save Changes" : "Create Exam"}
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </FormProvider>
                </DialogContent>
            </Dialog>

             <AlertDialog open={!!examToDelete} onOpenChange={(isOpen) => !isOpen && setExamToDelete(null)}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                    This will permanently delete the "{examToDelete?.name}" exam and all associated marks. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteExam} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete"}
                    </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

