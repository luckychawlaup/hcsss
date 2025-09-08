import Header from "@/components/dashboard/Header";
import FeePayment from "@/components/dashboard/FeePayment";
import Homework from "@/components/dashboard/Homework";
import ReportCard from "@/components/dashboard/ReportCard";
import LeaveApplication from "@/components/dashboard/LeaveApplication";
import Attendance from "@/components/dashboard/Attendance";
import BottomNav from "@/components/dashboard/BottomNav";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
        <div className="mx-auto grid w-full max-w-7xl gap-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Homework />
            <div className="space-y-6">
              <FeePayment />
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <ReportCard />
                <LeaveApplication />
              </div>
              <Attendance />
            </div>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
