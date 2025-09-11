import Header from "@/components/dashboard/Header";
import ProfilePageContent from "@/components/profile/ProfilePageContent";
import BottomNav from "@/components/dashboard/BottomNav";
import TeacherNav from "@/components/teacher/TeacherNav";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function ProfilePageSkeleton() {
  return <Skeleton className="w-full h-screen" />;
}

export default function ProfilePage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header title="My Profile" showAvatar={true} />
      <main className="flex-1 pb-24 md:pb-8">
        <Suspense fallback={<ProfilePageSkeleton />}>
          <ProfilePageContent />
        </Suspense>
      </main>
      <div className="md:hidden">
        {/* We need to determine which nav to show. A role check from a cookie or context is needed. */}
        {/* For now, let's assume a student might see this page too. */}
        {/* This logic will be improved with role management. */}
        <BottomNav />
      </div>
    </div>
  );
}
