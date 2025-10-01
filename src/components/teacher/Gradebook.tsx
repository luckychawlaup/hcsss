

"use client";

import { useState, useMemo, useEffect } from "react";
import type { Teacher } from "@/lib/supabase/teachers";
import type { Student } from "@/lib/supabase/students";
import { getExams, Exam } from "@/lib/supabase/exams";
import { setMarksForStudent, getStudentMarksForExam } from "@/lib/supabase/marks";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "../ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Users, BookOpen, UserCheck, Search, FileSignature, PlusCircle, Trash2, X, UserX } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";

interface GradebookProps {
  teacher: Teacher | null;
  students: Student[];
}

export default function Gradebook({ teacher, students }: GradebookProps) {
    const [exams, setExams] = useState<Exam[]>([]);
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [marks, setMarks] = useState<Record<string, { marks?: number, max_marks?: number, subject: string }>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFetchingMarks, setIsFetchingMarks] = useState(false);
    
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
                const marksMap: Record<string, { marks?: number, max_marks?: number, subject: string }> = {};
                existingMarks.forEach(mark => {
                    marksMap[mark.subject] = { marks: mark.marks, max_marks: mark.max_marks, subject: mark.subject };
                });
                setMarks(marksMap);
                setIsFetchingMarks(false);
            });
        }
    }, [selectedStudent, selectedExam]);

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
            await setMarksForStudent(selectedStudent.id, selectedExam.id, validMarks);
            toast({ title: "Marks Saved!", description: `Marks for ${selectedStudent.name} have been successfully saved.` });
        } catch (error) {
            console.error("Error setting marks:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to save marks." });
        } finally {
            setIsSubmitting(false);
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
                     <CardTitle className="flex items-center gap-2"><UserCheck />Select Student & Exam</CardTitle>
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
                                <CardTitle className="flex items-center gap-2"><FileSignature />Enter Marks</CardTitle>
                                <CardDescription>Entering grades for <span className="font-semibold text-primary">{selectedStudent.name}</span> in the <span className="font-semibold text-primary">{selectedExam.name}</span>.</CardDescription>
                            </div>
                             <Button asChild variant="outline" size="sm">
                                <Link href={`/report-card/${selectedExam.id}`} target="_blank">View Report Card</Link>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {Object.keys(marks).length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {Object.entries(marks).map(([key, value]) => (
                                        <div key={key} className="flex items-end gap-2 p-3 border rounded-lg">
                                            <div className="flex-1">
                                                <Label htmlFor={`subject-${key}`} className="text-sm">{value.subject}</Label>
                                                <div className="flex gap-2">
                                                    <Input 
                                                        id={`marks-${key}`}
                                                        type="number"
                                                        placeholder="Marks"
                                                        value={value.marks ?? ''}
                                                        onChange={(e) => handleMarksChange(key, e.target.value)}
                                                        max={value.max_marks || 100}
                                                        min={0}
                                                    />
                                                     <Input 
                                                        type="number"
                                                        placeholder="Max"
                                                        value={value.max_marks ?? ''}
                                                        onChange={(e) => handleMaxMarksChange(key, e.target.value)}
                                                        min={0}
                                                        className="w-20"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-end">
                                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                                        {isSubmitting ? <><Loader2 className="mr-2" /> Saving...</> : <><Save className="mr-2" /> Save Marks</>}
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <p className="text-muted-foreground text-center py-4">No subjects found for this student. Go to "Manage Datesheet" to add subjects for this exam.</p>
                        )}
                    </CardContent>
                </Card>
            ) : (
                 <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
                    <p className="text-muted-foreground">Please select an exam and a student to proceed.</p>
                </div>
            )}
        </div>
    );
}
