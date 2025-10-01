
"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getStudentByAuthId, Student } from "@/lib/supabase/students";
import { getExams, Exam } from "@/lib/supabase/exams";
import { getStudentMarksForExam } from "@/lib/supabase/marks";
import { isWithinInterval, startOfToday, parseISO, isAfter } from 'date-fns';

type ExamWithSubjects = Exam & { subjects: { subject: string; date: string }[] };

const supabase = createClient();

interface ExamDatesheetProps {
    onUpcomingExamLoad: (exam: Exam | null) => void;
}

export default function ExamDatesheet({ onUpcomingExamLoad }: ExamDatesheetProps) {
    const [student, setStudent] = useState<Student | null>(null);
    const [upcomingExam, setUpcomingExam] = useState<ExamWithSubjects | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setIsLoading(false);
                onUpcomingExamLoad(null);
                return;
            }

            const studentProfile = await getStudentByAuthId(user.id);
            setStudent(studentProfile);

            if (studentProfile) {
                const exams = await getExams((exams) => {
                    const today = startOfToday();

                    const relevantExams = exams.filter(e => e.start_date && e.end_date);
                    const currentOrNextExam = relevantExams.find(exam => {
                        const startDate = parseISO(exam.start_date!);
                        return today <= startDate || isWithinInterval(today, { start: startDate, end: parseISO(exam.end_date!) });
                    });
                    
                    onUpcomingExamLoad(currentOrNextExam || null);
                    
                    if (currentOrNextExam) {
                        getStudentMarksForExam(studentProfile.id, currentOrNextExam.id).then(marks => {
                            const examWithSubjects: ExamWithSubjects = {
                                ...currentOrNextExam,
                                subjects: marks.map(m => ({ subject: m.subject, date: m.exam_date || currentOrNextExam.date }))
                                            .filter(s => s.date)
                                            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                            };
                            setUpcomingExam(examWithSubjects);
                        });
                    } else {
                        setUpcomingExam(null);
                    }
                     setIsLoading(false);
                });
            } else {
                 setIsLoading(false);
                 onUpcomingExamLoad(null);
            }
        };

        fetchData();
    }, [onUpcomingExamLoad]);

    if (isLoading) {
        return <Skeleton className="h-48 w-full" />;
    }

    if (!upcomingExam || !upcomingExam.start_date) {
        // Return null or a placeholder if no exams are coming up.
        // The logic in DashboardPage will decide whether to show homework.
        return null;
    }

    const today = startOfToday();
    const startDate = parseISO(upcomingExam.start_date);
    const inExamPeriod = today >= startDate;

    if (inExamPeriod) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                        <CalendarDays className="h-6 w-6" />
                        {upcomingExam.name} Schedule
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {upcomingExam.subjects.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Subject</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {upcomingExam.subjects.map((s, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</TableCell>
                                        <TableCell>{s.subject}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center text-muted-foreground p-4">
                            The datesheet for this exam has not been published yet.
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    } else if (isAfter(startDate, today)) {
        // Exam is in the future, show the warning card
        return (
           <Card className="bg-yellow-50 border-yellow-200 w-full">
                <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-yellow-800 text-sm">Exams Approaching: {upcomingExam.name}</h3>
                        <p className="text-xs text-yellow-700">
                            Starts on {new Date(startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. Study well!
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }
    
    // If none of the conditions match, render nothing.
    return null;
}
