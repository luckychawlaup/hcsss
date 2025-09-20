
"use client";

import { useEffect, useState, Suspense } from 'react';
import { useParams, notFound } from 'next/navigation';
import { User } from "@supabase/supabase-js";
import { createClient } from '@/lib/supabase/client';
import { getStudentByAuthId, Student } from '@/lib/supabase/students';
import { getStudentMarksForExam, Mark } from '@/lib/supabase/marks';
import { getExams, Exam } from '@/lib/supabase/exams';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, Award, Check, Percent } from 'lucide-react';
import Image from 'next/image';
import { useTheme } from '@/components/theme/ThemeProvider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

function ReportCardSkeleton() {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
}

function ReportCardContent() {
    const [student, setStudent] = useState<Student | null>(null);
    const [marks, setMarks] = useState<Mark[]>([]);
    const [exam, setExam] = useState<Exam | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    const { settings } = useTheme();
    const params = useParams();
    const examId = params.examId as string;
    const supabase = createClient();

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            const currentUser = session?.user;
            setUser(currentUser);
            if (currentUser && examId) {
                try {
                    const studentData = await getStudentByAuthId(currentUser.id);
                    setStudent(studentData);

                    const allExams = await new Promise<Exam[]>((resolve) => {
                        const unsub = getExams(resolve);
                        return () => unsub.unsubscribe();
                    });
                    const currentExam = allExams.find(e => e.id === examId);
                    setExam(currentExam || null);

                    if (studentData) {
                        const marksData = await getStudentMarksForExam(studentData.authUid, examId);
                        setMarks(marksData);
                    }
                } catch (error) {
                    console.error("Error fetching report card data:", error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [supabase, examId]);

    const handlePrint = () => window.print();

    const totalMarksObtained = marks.reduce((acc, m) => acc + m.marks, 0);
    const totalMaxMarks = marks.reduce((acc, m) => acc + m.maxMarks, 0);
    const overallPercentage = totalMaxMarks > 0 ? (totalMarksObtained / totalMaxMarks) * 100 : 0;
    
    const getResultStatus = () => {
        const failingGrades = ['E'];
        const hasFailed = marks.some(m => failingGrades.includes(m.grade));
        return hasFailed ? { text: "NEEDS IMPROVEMENT", color: "text-red-500" } : { text: "PASS", color: "text-green-600" };
    }
    const resultStatus = getResultStatus();

    if (isLoading) return <ReportCardSkeleton />;
    if (!student || !exam || marks.length === 0) return notFound();

    return (
        <div className="bg-gray-100 p-4 sm:p-8 print:bg-white print:p-0">
            <div className="mx-auto max-w-4xl bg-white p-6 sm:p-10 shadow-lg print:shadow-none relative z-10 border rounded-lg">
                <header className="flex items-start justify-between pb-4 border-b-2 border-primary">
                    <div className="flex-shrink-0">
                        <Image src={settings.logoUrl || "https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png"} alt="School Logo" width={80} height={80} />
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-primary">{settings.schoolName}</h1>
                        <p className="text-sm text-muted-foreground">Joya Road, Amroha, 244221, Uttar Pradesh</p>
                        <h2 className="text-lg font-semibold mt-2">{exam.name} - Report Card</h2>
                    </div>
                    <div className="w-20"/>
                </header>

                <div className="print:hidden my-4 text-center">
                    <Button onClick={handlePrint}><Printer className="mr-2"/>Print Report Card</Button>
                </div>
                
                <section className="my-6 text-sm">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 border rounded-lg p-4">
                        <div className="flex justify-between"><span className="font-medium text-muted-foreground">Student's Name:</span><span className="font-semibold">{student.name}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-muted-foreground">Class:</span><span className="font-semibold">{student.class}-{student.section}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-muted-foreground">SRN:</span><span className="font-semibold">{student.srn}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-muted-foreground">Father's Name:</span><span className="font-semibold">{student.fatherName}</span></div>
                    </div>
                </section>

                <section>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40%]">Subject</TableHead>
                                <TableHead className="text-center">Max Marks</TableHead>
                                <TableHead className="text-center">Marks Obtained</TableHead>
                                <TableHead className="text-center">Grade</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {marks.map(m => (
                                <TableRow key={m.subject}>
                                    <TableCell className="font-medium">{m.subject}</TableCell>
                                    <TableCell className="text-center">{m.maxMarks}</TableCell>
                                    <TableCell className="text-center">{m.marks}</TableCell>
                                    <TableCell className="text-center font-semibold">{m.grade}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow className="bg-secondary">
                                <TableCell className="font-bold">Total</TableCell>
                                <TableCell className="text-center font-bold">{totalMaxMarks}</TableCell>
                                <TableCell className="text-center font-bold">{totalMarksObtained}</TableCell>
                                <TableCell />
                            </TableRow>
                        </TableFooter>
                    </Table>
                </section>
                
                <section className="mt-8 grid grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4 flex flex-col items-center justify-center">
                        <div className="flex items-center gap-2">
                             <Percent className="h-5 w-5 text-primary"/>
                            <p className="font-semibold text-muted-foreground">Overall Percentage</p>
                        </div>
                        <p className="text-3xl font-bold mt-2">{overallPercentage.toFixed(2)}%</p>
                    </div>
                    <div className="border rounded-lg p-4 flex flex-col items-center justify-center">
                         <div className="flex items-center gap-2">
                            <Check className="h-5 w-5 text-primary"/>
                            <p className="font-semibold text-muted-foreground">Result</p>
                        </div>
                        <p className={`text-3xl font-bold mt-2 ${resultStatus.color}`}>{resultStatus.text}</p>
                    </div>
                </section>

                <footer className="mt-16 border-t pt-4">
                    <div className="flex justify-between text-sm">
                        <div className="text-center">
                            <Separator className="w-32 my-10"/>
                            <p>Class Teacher's Signature</p>
                        </div>
                        <div className="text-center">
                            <Separator className="w-32 my-10"/>
                            <p>Principal's Signature</p>
                        </div>
                        <div className="text-center">
                             <Separator className="w-32 my-10"/>
                            <p>Parent's Signature</p>
                        </div>
                    </div>
                    <p className="text-center text-xs text-muted-foreground mt-8">This is a computer-generated document.</p>
                </footer>
            </div>
        </div>
    );
}

export default function ReportCardPage() {
    return (
        <Suspense fallback={<ReportCardSkeleton />}>
            <ReportCardContent />
        </Suspense>
    );
}

    