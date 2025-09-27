
import Header from "@/components/dashboard/Header";
import BottomNav from "@/components/dashboard/BottomNav";
import { Skeleton } from "../ui/skeleton";
import dynamic from "next/dynamic";
import { Card, CardHeader, CardTitle } from "../ui/card";
import { Camera } from "lucide-react";
import Link from "next/link";
import TodayHomework from "./TodayHomework";

const FeePayment = dynamic(() => import('@/components/dashboard/FeePayment'), {
  loading: () => <Skeleton className="h-28 w-full" />,
});
const ReportCard = dynamic(() => import('@/components/dashboard/ReportCard'), {
  loading: () => <Skeleton className="h-48 w-full" />,
});
const LeaveApplication = dynamic(() => import('@/components/dashboard/LeaveApplication'), {
  loading: () => <Skeleton className="h-48 w-full" />,
});
const Attendance = dynamic(() => import('@/components/dashboard/Attendance'), {
  loading: () => <Skeleton className="h-36 w-full" />,
});

const GalleryCard = () => (
    <Link href="/gallery">
        <Card className="hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                    <Camera className="h-6 w-6" />
                    School Gallery
                </CardTitle>
            </CardHeader>
        </Card>
    </Link>
)


export default function DashboardPage({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
         <div className="mx-auto w-full max-w-4xl space-y-6">
            <Attendance />
            <FeePayment />
            <TodayHomework />
        </div>
        <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
            <ReportCard />
            <LeaveApplication />
        </div>
        <div className="mx-auto w-full max-w-4xl">
            <GalleryCard />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
