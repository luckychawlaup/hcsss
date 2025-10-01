"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getStudentByAuthId, Student } from "@/lib/supabase/students";
import { getExams, Exam } from "@/lib/supabase/exams";
import { getMarksForStudent } from "@/lib/supabase/marks";
import { startOfDay, parseISO, isBefore, isAfter, subDays } from 'date-fns';

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

                const today = startOfDay(new Date());
                let relevantExam: Exam | undefined;
                let relevantSubjects: { subject: string; date: string }[] = [];

                // Find the most relevant exam with a datesheet
                const sortedExams = exams
                    .filter(exam => exam.start_date && exam.end_date)
                    .sort((a,b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime());
                
                for (const exam of sortedExams) {
                    const studentMarksForExam = marks[exam.id];
                    
                    // Check if this exam has a datesheet (subjects with dates)
                    if (studentMarksForExam && studentMarksForExam.some(m => m.exam_date)) {
                        const examStartDate = startOfDay(parseISO(exam.start_date!));
                        const examEndDate = startOfDay(parseISO(exam.end_date!));
                        const oneDayBeforeStart = subDays(examStartDate, 1);

                        // Show datesheet from 1 day before start until end date (inclusive)
                        // This means: if today >= oneDayBefore AND today <= endDate
                        const shouldShow = !isBefore(today, oneDayBeforeStart) && !isAfter(today, examEndDate);

                        if (shouldShow) {
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
        return <Skeleton className="h-48 w-full" />;
    }

    if (!upcomingExam || !upcomingExam.subjects || upcomingExam.subjects.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                    <CalendarDays className="h-6 w-6" />
                    {upcomingExam.name} Schedule
                </CardTitle>
            </CardHeader>
            <CardContent>
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
                                <TableCell className="font-medium">
                                    {new Date(s.date).toLocaleDateString('en-GB', { 
                                        day: '2-digit', 
                                        month: 'short',
                                        year: 'numeric'
                                    })}
                                </TableCell>
                                <TableCell>{s.subject}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}