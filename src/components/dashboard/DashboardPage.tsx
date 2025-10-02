"use client";

import Header from "@/components/dashboard/Header";
import SchoolStatus from "@/components/dashboard/SchoolStatus";
import Attendance from "@/components/dashboard/Attendance";
import TodayHomework from "@/components/dashboard/TodayHomework";
import ReportCardComponent from "@/components/dashboard/ReportCard";
import { Suspense, useState } from "react";
import { Skeleton } from "../ui/skeleton";
import { Card, CardContent } from "../ui/card";
import { Book, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";
import BottomNav from "./BottomNav";

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

const NcertCard = () => (
    <Link href="https://ncert.nic.in/textbook.php" target="_blank" rel="noopener noreferrer" className="block w-full">
        <Card className="group hover:bg-secondary transition-colors">
            <CardContent className="p-4 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
                    <Book className="h-6 w-6" />
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-sm">Online Textbooks</h3>
                    <p className="text-xs text-muted-foreground">
                        Access official NCERT textbooks for all subjects.
                    </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
        </Card>
    </Link>
)


export default function DashboardPage() {
  
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <div className="flex flex-1 flex-col">
        <Header title="Student Dashboard" showAvatar={true} />
        <main className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8">
            <Suspense fallback={<DashboardLoadingSkeleton />}>
                <div className="space-y-6">
                    <SchoolStatus />
                    
                    <div className="space-y-6">
                        <div className="h-full">
                           <TodayHomework />
                        </div>

                        <NcertCard />

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
       <BottomNav />
    </div>
  );
}
