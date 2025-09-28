
import Header from "@/components/dashboard/Header";
import ProfilePageContent from "@/components/profile/ProfilePageContent";
import { Suspense } from "react";
import { ProfileSkeleton } from "@/components/profile/ProfileDetails";


export default function ProfilePage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header title="My Profile" showAvatar={false} />
      <main className="flex-1">
        <Suspense fallback={<ProfileSkeleton />}>
          <ProfilePageContent />
        </Suspense>
      </main>
    </div>
  );
}
