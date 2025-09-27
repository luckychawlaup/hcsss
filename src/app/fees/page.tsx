
import Header from "@/components/dashboard/Header";
import BottomNav from "@/components/dashboard/BottomNav";
import FeeStatus from "@/components/fees/FeeStatus";
import StudentNav from "@/components/dashboard/StudentNav";

export default function FeesPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background md:flex-row">
        <StudentNav />
        <div className="flex flex-1 flex-col">
            <Header title="Fee Status" />
            <main className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
                <div className="mx-auto w-full max-w-4xl">
                    <FeeStatus />
                </div>
            </main>
        </div>
    </div>
  );
}
