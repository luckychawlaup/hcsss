import Header from "@/components/dashboard/Header";
import Homework from "@/components/dashboard/Homework";
import BottomNav from "@/components/dashboard/BottomNav";
import { Skeleton } from "../ui/skeleton";
import dynamic from "next/dynamic";

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


export default function DashboardPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
        <div className="mx-auto w-full max-w-4xl">
            <Homework />
        </div>
        <div className="mx-auto w-full max-w-4xl">
            <FeePayment />
        </div>
         <div className="mx-auto w-full max-w-4xl">
            <Attendance />
        </div>
        <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
            <ReportCard />
            <LeaveApplication />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
