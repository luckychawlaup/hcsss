
"use client";

import Header from "@/components/dashboard/Header";
import SchoolStatus from "@/components/dashboard/SchoolStatus";
import Attendance from "@/components/dashboard/Attendance";
import TodayHomework from "@/components/dashboard/TodayHomework";
import ReportCardComponent from "@/components/dashboard/ReportCard";
import { Suspense } from "react";
import { Skeleton } from "../ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Book } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";
import BottomNav from "./BottomNav";

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
