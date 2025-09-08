import Header from "@/components/dashboard/Header";
import ProfileDetails from "@/components/profile/ProfileDetails";

export default function ProfilePage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-4xl">
          <ProfileDetails />
        </div>
      </main>
    </div>
  );
}
