
"use client";

import { useState, useMemo, useEffect } from "react";
import type { Teacher } from "@/lib/supabase/teachers";
import type { Student } from "@/lib/supabase/students";
import { getExams, Exam, addExam, updateExam } from "@/lib/supabase/exams";
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
import { Loader2, Save, Users, BookOpen, UserCheck, Search, FileSignature, PlusCircle, Trash2, X, UserX, Calendar as CalendarIcon } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format as formatDate } from 'date-fns';

const createExamSchema = z.object({
  name: z.string().min(3, "Exam name must be at least 3 characters."),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
});

interface GradebookProps {
  teacher: Teacher | null;
  students: Student[];
}

export default function Gradebook({ teacher, students }: GradebookProps) {
    const [exams, setExams] = useState<Exam[]>([]);
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [marks, setMarks] = useState<Record<string, { marks?: number, max_marks?: number, subject: string, exam_date?: Date }>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFetchingMarks, setIsFetchingMarks] = useState(false);
    const [isCreateExamOpen, setIsCreateExamOpen] = useState(false);
    const [isCreatingExam, setIsCreatingExam] = useState(false);
    
    const { toast } = useToast();

    const classTeacherClass = teacher?.role === 'classTeacher' ? teacher.class_teacher_of : null;

    const studentsInClass = useMemo(() => {
        if (!classTeacherClass) return [];
        return students.filter(s => `${s.class}-${s.section}` === classTeacherClass);
    }, [students, classTeacherClass]);
    
    useEffect(() => {
        const unsubscribe = getExams(setExams);
        return () => {
            if (unsubscribe && typeof unsubscribe.unsubscribe === 'function') {
                unsubscribe.unsubscribe();
            }
        };
    }, []);
    
    useEffect(() => {
        setSelectedStudent(null);
        setMarks({});
    }, [classTeacherClass]);

    useEffect(() => {
        if (selectedStudent && selectedExam) {
            setIsFetchingMarks(true);
            getStudentMarksForExam(selectedStudent.id, selectedExam.id).then(existingMarks => {
                const marksMap: Record<string, { marks?: number, max_marks?: number, subject: string, exam_date?: Date }> = {};
                existingMarks.forEach(mark => {
                    marksMap[mark.subject] = { 
                        marks: mark.marks, 
                        max_marks: mark.max_marks, 
                        subject: mark.subject,
                        exam_date: mark.exam_date ? new Date(mark.exam_date) : undefined
                    };
                });
                
                (selectedStudent.opted_subjects || []).forEach(subject => {
                    if (!marksMap[subject]) {
                        marksMap[subject] = { marks: undefined, max_marks: 100, subject: subject, exam_date: undefined };
                    }
                })

                setMarks(marksMap);
                setIsFetchingMarks(false);
            });
        }
    }, [selectedStudent, selectedExam]);

    const handleAddSubject = () => {
        const newSubjectName = `Subject${Object.keys(marks).length + 1}`;
        setMarks(prev => ({
            ...prev,
            [newSubjectName]: { marks: undefined, max_marks: 100, subject: newSubjectName, exam_date: undefined }
        }));
    };
    
    const handleRemoveSubject = (subjectKey: string) => {
        setMarks(prev => {
            const newMarks = { ...prev };
            delete newMarks[subjectKey];
            return newMarks;
        });
    };

    const handleSubjectNameChange = (oldName: string, newName: string) => {
        setMarks(prev => {
            const newMarks = { ...prev };
            if (oldName !== newName && newMarks[oldName]) {
                 newMarks[newName] = { ...newMarks[oldName], subject: newName};
                 delete newMarks[oldName];
            }
            return newMarks;
        });
    };

    const handleMarksChange = (subject: string, value: string) => {
        const newMarks = { ...marks };
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue) && numValue >= 0) {
            newMarks[subject].marks = numValue;
        } else if (value === '') {
            newMarks[subject].marks = undefined;
        }
        setMarks(newMarks);
    };

    const handleMaxMarksChange = (subject: string, value: string) => {
        const newMarks = { ...marks };
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue) && numValue > 0) {
            newMarks[subject].max_marks = numValue;
        } else if (value === '') {
            newMarks[subject].max_marks = undefined;
        }
        setMarks(newMarks);
    };
    
    const handleDateChange = (subject: string, date: Date | undefined) => {
        setMarks(prev => ({
            ...prev,
            [subject]: { ...prev[subject], exam_date: date }
        }));
    };

    const handleSubmit = async () => {
        if (!selectedStudent || !selectedExam || Object.keys(marks).length === 0) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please select a student, an exam, and enter marks for at least one subject." });
            return;
        }
        
        const validMarks = Object.values(marks).filter(m => m.subject.trim() !== "" && m.marks !== undefined && m.max_marks !== undefined);
        if (validMarks.length === 0) {
            toast({ variant: "destructive", title: "No Valid Marks", description: "Please enter both marks and max marks for at least one subject." });
            return;
        }
        
        setIsSubmitting(true);
        try {
            const marksData = validMarks.map(m => ({
                subject: m.subject,
                marks: m.marks || 0,
                max_marks: m.max_marks || 100,
                exam_date: m.exam_date
            }));
            await setMarksForStudent(selectedStudent.id, selectedExam.id, marksData);
            toast({ title: "Marks Saved!", description: `Marks for ${selectedStudent.name} have been successfully saved.` });
        } catch (error) {
            console.error("Error setting marks:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to save marks." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const createExamForm = useForm<z.infer<typeof createExamSchema>>({
        resolver: zodResolver(createExamSchema),
        defaultValues: { 
            name: ""
        }
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
                <p className="text-muted-foreground mt-2">Only Class Teachers can manage the gradebook.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                         <CardTitle className="flex items-center gap-2"><UserCheck />Select Student & Exam</CardTitle>
                         <Button variant="outline" onClick={() => setIsCreateExamOpen(true)}><PlusCircle className="mr-2"/>Create New Exam</Button>
                    </div>
                    <CardDescription>Choose the exam and the student from your class to enter marks for.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select onValueChange={(val) => setSelectedExam(exams.find(e => e.id === val) || null)}>
                            <SelectTrigger><SelectValue placeholder="Select Exam" /></SelectTrigger>
                            <SelectContent>
                                {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select onValueChange={(val) => setSelectedStudent(studentsInClass.find(s => s.id === val) || null)} disabled={!classTeacherClass}>
                            <SelectTrigger><SelectValue placeholder="Select Student" /></SelectTrigger>
                            <SelectContent>
                                {studentsInClass.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {isFetchingMarks ? (
                <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
            ) : selectedStudent && selectedExam ? (
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="flex items-center gap-2"><FileSignature />Enter Marks & Schedule</CardTitle>
                                <CardDescription>Entering grades and exam dates for <span className="font-semibold text-primary">{selectedStudent.name}</span> in the <span className="font-semibold text-primary">{selectedExam.name}</span>.</CardDescription>
                            </div>
                             <Button asChild variant="outline" size="sm">
                                <Link href={`/report-card/${selectedExam.id}`} target="_blank">View Report Card</Link>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
                            {Object.entries(marks).map(([key, value]) => (
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
                                    <div className="w-full sm:w-24">
                                        <Label htmlFor={`marks-${key}`}>Marks</Label>
                                        <Input 
                                            id={`marks-${key}`}
                                            type="number"
                                            placeholder="e.g. 85"
                                            value={value.marks ?? ''}
                                            onChange={(e) => handleMarksChange(key, e.target.value)}
                                            max={value.max_marks || 100}
                                            min={0}
                                        />
                                    </div>
                                    <div className="w-full sm:w-24">
                                        <Label htmlFor={`max-marks-${key}`}>Max Marks</Label>
                                        <Input 
                                            id={`max-marks-${key}`}
                                            type="number"
                                            placeholder="e.g. 100"
                                            value={value.max_marks ?? ''}
                                            onChange={(e) => handleMaxMarksChange(key, e.target.value)}
                                            min={0}
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
                                {isSubmitting ? <><Loader2 className="mr-2" /> Saving...</> : <><Save className="mr-2" /> Save Marks</>}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                 <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
                    <p className="text-muted-foreground">Please select an exam and a student to proceed.</p>
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
