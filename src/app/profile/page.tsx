import Header from "@/components/dashboard/Header";
import ProfileDetails from "@/components/profile/ProfileDetails";
import BottomNav from "@/components/dashboard/BottomNav";

export default function ProfilePage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header title="My Profile" showAvatar={false} />
      <main className="flex-1 pb-24 md:pb-8">
        <ProfileDetails />
      </main>
      <BottomNav />
    </div>
  );
}
