
"use client";

import { useState, useMemo, useEffect } from "react";
import type { Teacher } from "@/lib/supabase/teachers";
import type { Student } from "@/lib/supabase/students";
import { getExams, Exam } from "@/lib/supabase/exams";
import { setMarksForStudent, getStudentMarksForExam, Mark } from "@/lib/supabase/marks";
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
import { Loader2, Save, Users, BookOpen, UserCheck, Search, FileSignature } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";


interface GradebookProps {
  teacher: Teacher | null;
  students: Student[];
}

export default function Gradebook({ teacher, students }: GradebookProps) {
    const [exams, setExams] = useState<Exam[]>([]);
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [selectedClass, setSelectedClass] = useState<string>("");
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [marks, setMarks] = useState<Record<string, number | undefined>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFetchingMarks, setIsFetchingMarks] = useState(false);
    const { toast } = useToast();

    const assignedClasses = useMemo(() => {
        if (!teacher) return [];
        const classes = new Set<string>();
        if (teacher.classTeacherOf) classes.add(teacher.classTeacherOf);
        if (teacher.classesTaught) teacher.classesTaught.forEach(c => classes.add(c));
        return Array.from(classes).sort();
    }, [teacher]);

    const studentsInClass = useMemo(() => {
        return students.filter(s => `${s.class}-${s.section}` === selectedClass);
    }, [students, selectedClass]);
    
    useEffect(() => {
        const unsubscribe = getExams(setExams);
        return () => unsubscribe.unsubscribe();
    }, []);
    
    useEffect(() => {
        setSelectedStudent(null);
        setMarks({});
    }, [selectedClass]);

    useEffect(() => {
        if (selectedStudent && selectedExam) {
            setIsFetchingMarks(true);
            getStudentMarksForExam(selectedStudent.authUid, selectedExam.id).then(existingMarks => {
                const marksMap: Record<string, number> = {};
                existingMarks.forEach(mark => {
                    marksMap[mark.subject] = mark.marks;
                });
                setMarks(marksMap);
                setIsFetchingMarks(false);
            });
        }
    }, [selectedStudent, selectedExam]);


    const handleMarksChange = (subject: string, value: string) => {
        const newMarks = { ...marks };
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue) && numValue >= 0 && numValue <= (selectedExam?.maxMarks || 100)) {
            newMarks[subject] = numValue;
        } else if (value === '') {
            newMarks[subject] = undefined;
        }
        setMarks(newMarks);
    };

    const handleSubmit = async () => {
        if (!selectedStudent || !selectedExam || Object.keys(marks).length === 0) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please select a student, an exam, and enter marks." });
            return;
        }
        setIsSubmitting(true);
        try {
            const marksData = (selectedStudent.optedSubjects || []).map(subject => ({
                subject,
                marks: marks[subject] || 0,
                maxMarks: selectedExam.maxMarks
            }));
            await setMarksForStudent(selectedStudent.authUid, selectedExam.id, marksData);
            toast({ title: "Marks Saved!", description: `Marks for ${selectedStudent.name} have been successfully saved.` });
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to save marks." });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const allSubjects = useMemo(() => {
        if (!selectedStudent) return [];
        return selectedStudent.optedSubjects || [];
    }, [selectedStudent]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><UserCheck />Select Student & Exam</CardTitle>
                    <CardDescription>Choose the exam, class, and student to enter or view marks for.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select onValueChange={(val) => setSelectedExam(exams.find(e => e.id === val) || null)}>
                            <SelectTrigger><SelectValue placeholder="Select Exam" /></SelectTrigger>
                            <SelectContent>
                                {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select onValueChange={setSelectedClass}>
                             <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                            <SelectContent>
                                {assignedClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select onValueChange={(val) => setSelectedStudent(studentsInClass.find(s => s.id === val) || null)} disabled={!selectedClass}>
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
                                <CardDescription>Entering marks for <span className="font-semibold text-primary">{selectedStudent.name}</span> for the <span className="font-semibold text-primary">{selectedExam.name}</span>.</CardDescription>
                            </div>
                             <Button asChild variant="outline" size="sm">
                                <Link href={`/report-card/${selectedExam.id}`} target="_blank">View Report Card</Link>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {allSubjects.map(subject => (
                                <div key={subject}>
                                    <Label htmlFor={`marks-${subject}`}>{subject}</Label>
                                    <Input 
                                        id={`marks-${subject}`}
                                        type="number"
                                        placeholder={`Marks out of ${selectedExam.maxMarks}`}
                                        value={marks[subject] ?? ''}
                                        onChange={(e) => handleMarksChange(subject, e.target.value)}
                                        max={selectedExam.maxMarks}
                                        min={0}
                                    />
                                </div>
                            ))}
                        </div>
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? <><Loader2 className="mr-2" /> Saving...</> : <><Save className="mr-2" /> Save Marks</>}
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                 <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
                    <p className="text-muted-foreground">Please select an exam, class, and student to proceed.</p>
                </div>
            )}
        </div>
    );
}
