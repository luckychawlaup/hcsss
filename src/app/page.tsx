import Header from "@/components/dashboard/Header";
import FeePayment from "@/components/dashboard/FeePayment";
import Homework from "@/components/dashboard/Homework";
import ReportCard from "@/components/dashboard/ReportCard";
import LeaveApplication from "@/components/dashboard/LeaveApplication";
import Attendance from "@/components/dashboard/Attendance";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6">
          <Homework />
          <FeePayment />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <ReportCard />
            <LeaveApplication />
            <Attendance />
          </div>
        </div>
      </main>
    </div>
  );
}
