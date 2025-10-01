
"use client";

import { useState, useMemo, useEffect } from "react";
import type { Teacher } from "@/lib/supabase/teachers";
import { getExams, Exam, addExam } from "@/lib/supabase/exams";
import { setMarksForStudent, getStudentMarksForExam, Mark } from "@/lib/supabase/marks";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "../ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, BookOpen, FileSignature, PlusCircle, Trash2, X, UserX, Calendar as CalendarIcon, Check } from "lucide-react";
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

interface DatesheetManagerProps {
  teacher: Teacher | null;
}

export default function DatesheetManager({ teacher }: DatesheetManagerProps) {
    const [exams, setExams] = useState<Exam[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [subjects, setSubjects] = useState<Record<string, { subject: string, exam_date?: Date }>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFetchingSubjects, setIsFetchingSubjects] = useState(false);
    const [isCreateExamOpen, setIsCreateExamOpen] = useState(false);
    const [isCreatingExam, setIsCreatingExam] = useState(false);
    
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
            const studentsInClass = students.filter(s => `${s.class}-${s.section}` === classTeacherClass);
            const firstStudentId = studentsInClass[0]?.id;

            if (firstStudentId) {
                getStudentMarksForExam(firstStudentId, selectedExam.id).then(marks => {
                    if (marks.length > 0) {
                        const initialSubjects = marks.reduce((acc, mark) => {
                            acc[mark.subject] = {
                                subject: mark.subject,
                                exam_date: mark.exam_date ? new Date(mark.exam_date) : undefined
                            };
                            return acc;
                        }, {} as Record<string, { subject: string, exam_date?: Date }>);
                        setSubjects(initialSubjects);
                    } else {
                        // If no marks exist, use teacher's subjects as default
                        const defaultSubjects = teacher?.qualifications || ["English", "Hindi", "Maths", "Science", "Social Science"];
                        const initialSubjects: Record<string, { subject: string, exam_date?: Date }> = {};
                        defaultSubjects.forEach(sub => {
                            initialSubjects[sub] = { subject: sub, exam_date: undefined };
                        });
                        setSubjects(initialSubjects);
                    }
                     setIsFetchingSubjects(false);
                });
            } else {
                const defaultSubjects = teacher?.qualifications || ["English", "Hindi", "Maths", "Science", "Social Science"];
                const initialSubjects: Record<string, { subject: string, exam_date?: Date }> = {};
                defaultSubjects.forEach(sub => {
                    initialSubjects[sub] = { subject: sub, exam_date: undefined };
                });
                setSubjects(initialSubjects);
                setIsFetchingSubjects(false);
            }
        } else {
            setSubjects({});
        }
    }, [selectedExam, classTeacherClass, students, teacher?.qualifications]);
    
    const handleAddSubject = () => {
        const newSubjectName = `New Subject ${Object.keys(subjects).length + 1}`;
        setSubjects(prev => ({
            ...prev,
            [newSubjectName]: { subject: newSubjectName, exam_date: undefined }
        }));
    };
    
    const handleRemoveSubject = (subjectKey: string) => {
        setSubjects(prev => {
            const newSubjects = { ...prev };
            delete newSubjects[subjectKey];
            return newSubjects;
        });
    };

    const handleSubjectNameChange = (oldName: string, newName: string) => {
        setSubjects(prev => {
            const newSubjects = { ...prev };
            if (oldName !== newName && newSubjects[oldName]) {
                 newSubjects[newName] = { ...newSubjects[oldName], subject: newName };
                 delete newSubjects[oldName];
            }
            return newSubjects;
        });
    };
    
    const handleDateChange = (subject: string, date: Date | undefined) => {
        setSubjects(prev => ({
            ...prev,
            [subject]: { ...prev[subject], exam_date: date }
        }));
    };

    const handleSubmit = async () => {
        if (!selectedExam || !classTeacherClass || Object.keys(subjects).length === 0) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please select an exam and add subjects." });
            return;
        }

        const studentsInClass = students.filter(s => `${s.class}-${s.section}` === classTeacherClass);
        if (studentsInClass.length === 0) {
             toast({ variant: "destructive", title: "No Students in Class", description: "Cannot save datesheet for a class with no students." });
             return;
        }

        setIsSubmitting(true);
        try {
            const scheduleData = Object.values(subjects).map(s => ({
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

    const handleCreateExam = async (values: z.infer<typeof createExamSchema>) => {
        setIsCreatingExam(true);
        try {
            const examData = {
                name: values.name.trim(),
                date: new Date().toISOString(),
                start_date: values.start_date?.toISOString(),
                end_date: values.end_date?.toISOString(),
            };
            
            const newExam = await addExam(examData);
            
            if (newExam) {
                toast({ 
                    title: "Exam Created Successfully", 
                    description: `${newExam.name} has been added.`
                });
                setIsCreateExamOpen(false);
                createExamForm.reset();
            } else {
                throw new Error("Failed to create exam - no data returned");
            }
        } catch (error: any) {
            toast({ 
                variant: "destructive", 
                title: "Failed to Create Exam", 
                description: error.message || "An unknown error occurred."
            });
        } finally {
            setIsCreatingExam(false);
        }
    };
    
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
                         <CardTitle className="flex items-center gap-2"><BookOpen />Select Exam</CardTitle>
                         <Button variant="outline" onClick={() => setIsCreateExamOpen(true)}><PlusCircle className="mr-2"/>Create New Exam</Button>
                    </div>
                    <CardDescription>Choose an exam to create or edit its datesheet for your class: <span className="font-semibold text-primary">{classTeacherClass}</span></CardDescription>
                </CardHeader>
                <CardContent>
                     <Select onValueChange={(val) => setSelectedExam(exams.find(e => e.id === val) || null)}>
                        <SelectTrigger><SelectValue placeholder="Select Exam" /></SelectTrigger>
                        <SelectContent>
                            {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
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
                            {Object.entries(subjects).map(([key, value]) => (
                                <div key={key} className="flex flex-col sm:flex-row items-start sm:items-end gap-2 p-3 border rounded-lg">
                                    <div className="flex-1 w-full sm:w-auto">
                                        <Label htmlFor={`subject-${key}`}>Subject</Label>
                                        <Input
                                          id={`subject-${key}`}
                                          value={value.subject}
                                          onChange={(e) => handleSubjectNameChange(key, e.target.value)}
                                          placeholder="Subject Name"
                                        />
                                    </div>
                                     <div className="w-full sm:w-auto">
                                        <Label>Exam Date</Label>
                                        <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !value.exam_date && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {value.exam_date ? formatDate(value.exam_date, "PPP") : <span>Pick date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar mode="single" selected={value.exam_date} onSelect={(date) => handleDateChange(key, date)} initialFocus />
                                        </PopoverContent>
                                        </Popover>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveSubject(key)}><Trash2 className="text-destructive"/></Button>
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
             <Dialog open={isCreateExamOpen} onOpenChange={setIsCreateExamOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Exam</DialogTitle>
                        <DialogDescription>Define a new exam for which you can record marks. You can optionally add a start and end date for the exam period.</DialogDescription>
                    </DialogHeader>
                    <FormProvider {...createExamForm}>
                        <form onSubmit={createExamForm.handleSubmit(handleCreateExam)} className="space-y-4">
                            
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
                                    onClick={() => setIsCreateExamOpen(false)}
                                    disabled={isCreatingExam}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isCreatingExam}>
                                    {isCreatingExam ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <PlusCircle className="mr-2 h-4 w-4"/>
                                            Create Exam
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </FormProvider>
                </DialogContent>
            </Dialog>
        </div>
    );
}
