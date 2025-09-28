
"use client";

import Header from "@/components/dashboard/Header";
import BottomNav from "@/components/dashboard/BottomNav";
import SchoolStatus from "@/components/dashboard/SchoolStatus";
import Attendance from "@/components/dashboard/Attendance";
import TodayHomework from "@/components/dashboard/TodayHomework";
import ReportCardComponent from "@/components/dashboard/ReportCard";
import StudentNav from "@/components/dashboard/StudentNav";
import { Suspense } from "react";
import { Skeleton } from "../ui/skeleton";

function DashboardLoadingSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-16 w-full" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
        </div>
    )
}


export default function DashboardPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <div className="flex flex-1 flex-col">
        <Header title="Student Dashboard" showAvatar={true} />
        <main className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
            <Suspense fallback={<DashboardLoadingSkeleton />}>
                <div className="space-y-6">
                    <SchoolStatus />
                    <div className="grid gap-6 md:grid-cols-2">
                        <TodayHomework />
                        <ReportCardComponent />
                    </div>
                    <Attendance />
                </div>
            </Suspense>
        </main>
      </div>
      <StudentNav />
    </div>
  );
}
