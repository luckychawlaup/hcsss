
import Header from "@/components/dashboard/Header";
import ReportCard from '@/components/dashboard/ReportCard';
import Attendance from '@/components/dashboard/Attendance';
import TodayHomework from '@/components/dashboard/TodayHomework';
import StudentNav from "./StudentNav";
import SchoolStatus from "./SchoolStatus";


export default function DashboardPage({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background md:flex-row">
      <StudentNav />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
           <div className="mx-auto w-full max-w-4xl space-y-6">
              <SchoolStatus />
              <TodayHomework />
              <Attendance />
          </div>
          <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
              <ReportCard />
          </div>
        </main>
      </div>
    </div>
  );
}
