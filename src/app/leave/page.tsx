import Header from "@/components/dashboard/Header";
import LeavePageContent from "@/components/leave/LeavePageContent";
import BottomNav from "@/components/dashboard/BottomNav";

export default function LeavePage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
        <div className="mx-auto w-full max-w-4xl">
          <LeavePageContent />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
