
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
import Footer from "./Footer";

function DashboardLoadingSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-16 w-full" />
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <Skeleton className="h-96 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
                <div className="space-y-6">
                     <Skeleton className="h-48 w-full" />
                     <Skeleton className="h-48 w-full" />
                </div>
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
                    <div className="flex flex-col lg:flex-row lg:gap-8 gap-6">
                       <div className="lg:w-2/3 space-y-6">
                            {showDatesheetInsteadOfHomework ? (
                                <Card className="flex flex-col">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-primary">
                                            <Eye className="h-6 w-6" />
                                            Exams in Progress
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex-1 flex flex-col justify-center items-center text-center">
                                        <p className="text-muted-foreground mb-4">
                                            Your exams are ongoing. You can view your homework assignments by clicking the button below.
                                        </p>
                                        <Button asChild>
                                            <Link href="/homework">
                                                View Homework
                                            </Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : <TodayHomework /> }
                           <Attendance />
                       </div>
                       <div className="lg:w-1/3 space-y-6">
                           <ExamDatesheet onUpcomingExamLoad={setUpcomingExam} />
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
                                        Access NCERT textbooks and other educational resources directly.
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
                </div>
            </Suspense>
        </main>
      </div>
      <Footer />
       <BottomNav />
    </div>
  );
}
