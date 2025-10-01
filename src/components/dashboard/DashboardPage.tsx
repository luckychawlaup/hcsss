
"use client";

import Header from "@/components/dashboard/Header";
import SchoolStatus from "@/components/dashboard/SchoolStatus";
import Attendance from "@/components/dashboard/Attendance";
import TodayHomework from "@/components/dashboard/TodayHomework";
import ReportCardComponent from "@/components/dashboard/ReportCard";
import ExamDatesheet from "@/components/dashboard/ExamDatesheet";
import { Suspense, useState } from "react";
import { Skeleton } from "../ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Book, Eye } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";
import BottomNav from "./BottomNav";
import type { Exam } from "@/lib/supabase/exams";
import { isAfter, startOfToday, parseISO, isWithinInterval, subDays, endOfDay } from "date-fns";

function DashboardLoadingSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-16 w-full" />
            <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-96 w-full" />
                 <Skeleton className="h-48 w-full" />
                 <Skeleton className="h-48 w-full" />
            </div>
        </div>
    )
}


export default function DashboardPage() {
  const [upcomingExam, setUpcomingExam] = useState<Exam | null | undefined>(undefined);
  
  const today = startOfToday();
  let showDatesheetInsteadOfHomework = false;

  if (upcomingExam?.start_date && upcomingExam.end_date) {
    const examStartDate = parseISO(upcomingExam.start_date);
    const examEndDate = endOfDay(parseISO(upcomingExam.end_date));
    // Show datesheet one day before the exam starts and until it ends
    const periodForDatesheet = {
        start: subDays(examStartDate, 1),
        end: examEndDate
    };
    showDatesheetInsteadOfHomework = isWithinInterval(today, periodForDatesheet);
  }


  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <div className="flex flex-1 flex-col">
        <Header title="Student Dashboard" showAvatar={true} />
        <main className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
            <Suspense fallback={<DashboardLoadingSkeleton />}>
                <div className="space-y-6">
                    <SchoolStatus />
                    <div className="grid gap-6 md:grid-cols-2">
                        <ExamDatesheet onUpcomingExamLoad={setUpcomingExam} />
                        
                        {showDatesheetInsteadOfHomework ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-primary">
                                        <Eye className="h-6 w-6" />
                                        Exams in Progress
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground mb-4">
                                        Your exams are ongoing. You can still view your homework assignments.
                                    </p>
                                    <Button asChild className="w-full">
                                        <Link href="/homework">
                                            View Homework
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : <TodayHomework /> }

                        <Attendance />
                        <ReportCardComponent />
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-primary">
                                    <Book className="h-6 w-6" />
                                    Online Textbooks
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground mb-4">
                                    Access NCERT textbooks and other educational resources directly from the official source.
                                </p>
                                <Button asChild className="w-full">
                                    <a href="https://ncert.nic.in/textbook.php" target="_blank" rel="noopener noreferrer">
                                        Download Textbooks
                                    </a>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </Suspense>
        </main>
      </div>
       <BottomNav />
    </div>
  );
}
