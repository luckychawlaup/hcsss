
import Header from "@/components/dashboard/Header";
import BottomNav from "@/components/dashboard/BottomNav";
import TeacherNav from "@/components/teacher/TeacherNav";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";

export default function FeedbackPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header title="Complaint & Feedback" />
      <main className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
        <div className="mx-auto w-full max-w-2xl">
            <FeedbackForm />
        </div>
      </main>
      {/* We need to conditionally render the correct nav. This is a simple way for now. */}
      {/* A better implementation would use role from a context provider. */}
      <div className="md:hidden">
        <BottomNav />
      </div>
      <div className="hidden md:block">
        {/* Placeholder for potential desktop-specific nav logic if needed */}
      </div>
    </div>
  );
}
