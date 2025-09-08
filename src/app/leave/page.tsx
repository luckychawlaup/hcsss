import Header from "@/components/dashboard/Header";
import LeavePageContent from "@/components/leave/LeavePageContent";
import BottomNav from "@/components/dashboard/BottomNav";

export default function LeavePage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header title="Leave Application" />
      <main className="flex-1 pb-24 md:pb-8">
        <LeavePageContent />
      </main>
      <BottomNav />
    </div>
  );
}
