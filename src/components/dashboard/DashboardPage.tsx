
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
import { Book, Eye, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";
import BottomNav from "./BottomNav";
import type { Exam } from "@/lib/supabase/exams";
import { isAfter, startOfToday, parseISO, isWithinInterval, subDays, endOfDay } from "date-fns";
import Footer from "./Footer";

function DashboardLoadingSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-80 w-full" />
            <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        </div>
    )
}


export default function DashboardPage() {
  const [upcomingExam, setUpcomingExam] = useState<Exam | null | undefined>(undefined);
  
  const today = startOfToday();
  let showDatesheetInsteadOfHomework = false;
  let examsAreOn = false;

  if (upcomingExam?.start_date && upcomingExam.end_date) {
    const examStartDate = parseISO(upcomingExam.start_date);
    const examEndDate = endOfDay(parseISO(upcomingExam.end_date));
    
    // Show alert one day before
    const periodForDatesheet = {
        start: subDays(examStartDate, 1),
        end: examEndDate
    };

    // Determine if exams are currently active
    const examActivePeriod = {
        start: examStartDate,
        end: examEndDate
    }
    
    showDatesheetInsteadOfHomework = isWithinInterval(today, periodForDatesheet);
    examsAreOn = isWithinInterval(today, examActivePeriod);
  }


  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <div className="flex flex-1 flex-col">
        <Header title="Student Dashboard" showAvatar={true} />
        <main className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8 pb-24">
            <Suspense fallback={<DashboardLoadingSkeleton />}>
                <div className="space-y-6">
                    <SchoolStatus />
                    
                    {showDatesheetInsteadOfHomework && upcomingExam && (
                        <Card className="bg-yellow-50 border-yellow-200 w-full dark:bg-yellow-900/20 dark:border-yellow-800">
                             <CardContent className="p-4 flex items-center gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-400 flex-shrink-0">
                                    <AlertTriangle className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-yellow-800 text-sm dark:text-yellow-200">{examsAreOn ? "Exams are Ongoing!" : "Exams Approaching!"}</h3>
                                    <p className="text-xs text-yellow-700 dark:text-yellow-400">
                                        {upcomingExam.name} starts on {new Date(upcomingExam.start_date!).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}. Good luck!
                                    </p>
                                </div>
                                <Button variant="secondary" size="sm" asChild>
                                    <Link href="/homework">View Homework</Link>
                                </Button>
                             </CardContent>
                        </Card>
                    )}
                    
                    {/* Main content grid */}
                    <div className="space-y-6">
                        {/* Hero Component: Homework or Datesheet */}
                        <div className="h-full">
                           {showDatesheetInsteadOfHomework 
                                ? <ExamDatesheet onUpcomingExamLoad={setUpcomingExam} /> 
                                : <TodayHomework />
                            }
                        </div>

                        {/* Grid for other cards */}
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                            <div className="lg:col-span-3">
                                <Attendance />
                            </div>
                            <div className="lg:col-span-2">
                                <ReportCardComponent />
                            </div>
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
