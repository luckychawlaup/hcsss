
import Header from "@/components/dashboard/Header";
import Homework from "@/components/dashboard/Homework";
import BottomNav from "@/components/dashboard/BottomNav";

export default function HomeworkPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header title="Homework" />
      <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 pb-24">
        <div className="mx-auto w-full max-w-4xl">
          <Homework />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
