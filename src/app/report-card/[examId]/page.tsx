
"use client";

import { useEffect, useState, Suspense } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import { User } from "@supabase/supabase-js";
import { createClient } from '@/lib/supabase/client';
import { getStudentByAuthId, Student } from '@/lib/supabase/students';
import { getStudentMarksForExam, Mark } from '@/lib/supabase/marks';
import { getExams, Exam } from '@/lib/supabase/exams';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, Award, Check, Percent } from 'lucide-react';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useSchoolInfo } from '@/hooks/use-school-info';


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
    const { schoolInfo, isLoading: isSchoolInfoLoading } = useSchoolInfo();

    const params = useParams();
    const router = useRouter();
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
                        const unsub = getExams(exams => {
                           resolve(exams);
                           if (unsub && typeof unsub.unsubscribe === 'function') {
                               unsub.unsubscribe();
                           }
                        });
                    });
                    const currentExam = allExams.find(e => e.id === examId);
                    setExam(currentExam || null);

                    if (studentData) {
                        const marksData = await getStudentMarksForExam(studentData.id, examId);
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
    const totalMaxMarks = marks.reduce((acc, m) => acc + m.max_marks, 0);
    const overallPercentage = totalMaxMarks > 0 ? (totalMarksObtained / totalMaxMarks) * 100 : 0;
    
    const hasFailedAnySubject = marks.some(m => (m.marks / m.max_marks) < 0.33);
    
    const getResultStatus = () => {
        return hasFailedAnySubject ? { text: "NEEDS IMPROVEMENT", color: "text-red-500" } : { text: "PASS", color: "text-green-600" };
    }
    const resultStatus = getResultStatus();

    const getSubjectStatus = (marks: number, maxMarks: number) => {
        if (maxMarks === 0) return { text: "N/A", variant: "secondary" as const };
        const percentage = (marks / maxMarks) * 100;
        return percentage >= 33 ? { text: "Pass", variant: "success" as const } : { text: "Fail", variant: "destructive" as const };
    }
    
    const borderText = (schoolInfo?.name.toUpperCase() || "HILTON CONVENT SCHOOL") + " ";

    if (isLoading || isSchoolInfoLoading) return <ReportCardSkeleton />;
    if (!student || !exam || !schoolInfo) return notFound();
    if (marks.length === 0) {
        return (
             <div className="flex h-screen items-center justify-center text-center p-4">
                <div>
                    <h1 className="text-2xl font-bold">No Marks Entered Yet</h1>
                    <p className="text-muted-foreground mt-2">The marks for {exam.name} have not been entered for {student.name}.</p>
                    <Button asChild className="mt-4">
                        <Link href="/">Go to Dashboard</Link>
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-muted/40 p-4 sm:p-8 print:p-0">
            <div className="mx-auto max-w-4xl bg-card p-6 sm:p-10 shadow-lg print:shadow-none relative z-10 border rounded-lg overflow-hidden">
                <div className="absolute inset-0 z-0 pointer-events-none opacity-50">
                    <div className="absolute -top-1 left-0 h-4 text-[8px] leading-none whitespace-nowrap text-gray-200 dark:text-gray-700" style={{ writingMode: 'horizontal-tb' }}>{borderText.repeat(50)}</div>
                    <div className="absolute -bottom-1 left-0 h-4 text-[8px] leading-none whitespace-nowrap text-gray-200 dark:text-gray-700" style={{ writingMode: 'horizontal-tb' }}>{borderText.repeat(50)}</div>
                    <div className="absolute top-0 -left-1 w-4 text-[8px] leading-none whitespace-nowrap text-gray-200 dark:text-gray-700 origin-top-left" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{borderText.repeat(50)}</div>
                    <div className="absolute top-0 -right-1 w-4 text-[8px] leading-none whitespace-nowrap text-gray-200 dark:text-gray-700 origin-top-right" style={{ writingMode: 'vertical-rl' }}>{borderText.repeat(50)}</div>
                </div>
                 <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none print:hidden">
                    <h1 className="text-[10vw] font-bold text-gray-200/30 dark:text-gray-700/30 transform -rotate-12 select-none whitespace-nowrap">
                       {schoolInfo.name}
                    </h1>
                </div>

                <div className="relative z-10">
                    <header className="flex items-start justify-between pb-4 border-b-2 border-primary">
                        <div className="flex-shrink-0">
                            <Image src="/hcsss.png" alt="School Logo" width={80} height={80} />
                        </div>
                        <div className="text-center">
                            <h1 className="text-2xl font-bold text-primary">{schoolInfo.name}</h1>
                            <p className="text-sm text-muted-foreground">{schoolInfo.address}</p>
                            <h2 className="text-lg font-semibold mt-2">{exam.name} - Report Card</h2>
                        </div>
                        <div className="w-20"/>
                    </header>

                    <div className="print:hidden my-4 text-center">
                        <Button onClick={handlePrint}><Printer className="mr-2"/>Print Report Card</Button>
                    </div>
                    
                    <section className="my-6 text-sm">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 border rounded-lg p-4 bg-background/80 backdrop-blur-sm">
                            <div className="flex justify-between"><span className="font-medium text-muted-foreground">Student's Name:</span><span className="font-semibold">{student.name}</span></div>
                            <div className="flex justify-between"><span className="font-medium text-muted-foreground">Class:</span><span className="font-semibold">{student.class}-{student.section}</span></div>
                            <div className="flex justify-between"><span className="font-medium text-muted-foreground">SRN:</span><span className="font-semibold">{student.srn}</span></div>
                            <div className="flex justify-between"><span className="font-medium text-muted-foreground">Father's Name:</span><span className="font-semibold">{student.father_name}</span></div>
                        </div>
                    </section>

                    <section className="bg-background/80 backdrop-blur-sm rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[40%]">Subject</TableHead>
                                    <TableHead className="text-center">Max Marks</TableHead>
                                    <TableHead className="text-center">Marks Obtained</TableHead>
                                    <TableHead className="text-center">Grade</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {marks.map(m => {
                                    const subjectStatus = getSubjectStatus(m.marks, m.max_marks);
                                    return (
                                        <TableRow key={m.subject}>
                                            <TableCell className="font-medium">{m.subject}</TableCell>
                                            <TableCell className="text-center">{m.max_marks}</TableCell>
                                            <TableCell className="text-center">{m.marks}</TableCell>
                                            <TableCell className="text-center font-semibold">{m.grade}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={subjectStatus.variant}>{subjectStatus.text}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                            <TableFooter>
                                <TableRow className="bg-secondary/50">
                                    <TableCell className="font-bold">Total</TableCell>
                                    <TableCell className="text-center font-bold">{totalMaxMarks}</TableCell>
                                    <TableCell className="text-center font-bold">{totalMarksObtained}</TableCell>
                                    <TableCell />
                                    <TableCell />
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </section>
                    
                    <section className="mt-8 grid grid-cols-2 gap-4">
                        <div className="border rounded-lg p-4 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                            <div className="flex items-center gap-2">
                                 <Percent className="h-5 w-5 text-primary"/>
                                <p className="font-semibold text-muted-foreground">Overall Percentage</p>
                            </div>
                            <p className="text-3xl font-bold mt-2">{overallPercentage.toFixed(2)}%</p>
                        </div>
                        <div className="border rounded-lg p-4 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                             <div className="flex items-center gap-2">
                                <Check className="h-5 w-5 text-primary"/>
                                <p className="font-semibold text-muted-foreground">Result</p>
                            </div>
                            <p className={`text-3xl font-bold mt-2 ${resultStatus.color}`}>{resultStatus.text}</p>
                        </div>
                    </section>

                    <footer className="mt-16 border-t pt-4 text-center text-xs text-muted-foreground">
                        <p>This is a computer-generated document and does not require a signature.</p>
                    </footer>
                </div>
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

    
