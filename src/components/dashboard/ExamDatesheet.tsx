
"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getStudentByAuthId, Student } from "@/lib/supabase/students";
import { getExams, Exam } from "@/lib/supabase/exams";
import { getMarksForStudent } from "@/lib/supabase/marks";
import { isWithinInterval, startOfToday, parseISO, isAfter, isBefore } from 'date-fns';
import { ScrollArea } from "../ui/scroll-area";

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
        let isMounted = true;

        const fetchData = async () => {
            setIsLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                if (isMounted) setIsLoading(false);
                onUpcomingExamLoad(null);
                return;
            }

            const studentProfile = await getStudentByAuthId(user.id);
            if (!isMounted) return;
            setStudent(studentProfile);

            if (studentProfile) {
                const [exams, marks] = await Promise.all([
                    new Promise<Exam[]>(resolve => {
                        const unsub = getExams(examsData => {
                            resolve(examsData || []);
                            if (unsub && typeof unsub.unsubscribe === 'function') unsub.unsubscribe();
                        });
                    }),
                    getMarksForStudent(studentProfile.id)
                ]);

                if (!isMounted) return;

                const today = startOfToday();
                let relevantExam: Exam | undefined;
                let relevantSubjects: { subject: string; date: string }[] = [];

                const sortedExams = exams.sort((a,b) => new Date(a.start_date || a.date).getTime() - new Date(b.start_date || b.date).getTime());
                
                for (const exam of sortedExams) {
                    const studentMarksForExam = marks[exam.id];
                    if (studentMarksForExam && studentMarksForExam.some(m => m.exam_date)) {
                        const examEndDate = exam.end_date ? parseISO(exam.end_date) : null;
                        if (!examEndDate || isAfter(examEndDate, today)) {
                            relevantExam = exam;
                            relevantSubjects = studentMarksForExam
                                .filter(mark => mark.exam_date)
                                .map(mark => ({
                                    subject: mark.subject,
                                    date: mark.exam_date!,
                                }))
                                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                            break; 
                        }
                    }
                }
                
                onUpcomingExamLoad(relevantExam || null);

                if (relevantExam) {
                    setUpcomingExam({ ...relevantExam, subjects: relevantSubjects });
                } else {
                    setUpcomingExam(null);
                }

                if (isMounted) setIsLoading(false);
            } else {
                 if (isMounted) setIsLoading(false);
                 onUpcomingExamLoad(null);
            }
        };

        fetchData();
        return () => { isMounted = false };
    }, [onUpcomingExamLoad]);

    if (isLoading) {
        return <Skeleton className="h-full w-full" />;
    }

    if (!upcomingExam || !upcomingExam.start_date) {
        return (
             <Card className="h-full flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                        <CalendarDays className="h-6 w-6" />
                        Upcoming Exams
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-center items-center text-center">
                    <CalendarDays className="h-10 w-10 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground font-semibold">No upcoming exams.</p>
                    <p className="text-sm text-muted-foreground">The next exam schedule has not been published yet.</p>
                </CardContent>
            </Card>
        );
    }

    const today = startOfToday();
    const startDate = parseISO(upcomingExam.start_date);
    
    if (isAfter(startDate, today)) {
        return (
           <Card className="bg-yellow-50 border-yellow-200 w-full">
                <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-yellow-800 text-sm">Exams Approaching: {upcomingExam.name}</h3>
                        <p className="text-xs text-yellow-700">
                            Starts on {new Date(startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}. Study well!
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                    <CalendarDays className="h-6 w-6" />
                    {upcomingExam.name} Schedule
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                {upcomingExam.subjects.length > 0 ? (
                    <ScrollArea className="h-96">
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
                    </ScrollArea>
                ) : (
                    <div className="text-center text-muted-foreground p-4 h-full flex justify-center items-center">
                        The datesheet for this exam has not been published yet.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
