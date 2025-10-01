
import Header from "@/components/dashboard/Header";
import BottomNav from "@/components/dashboard/BottomNav";
import { Wallet } from "lucide-react";

export default function FeesPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
        <div className="flex flex-1 flex-col">
            <Header title="Fee Status" />
            <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
                <div className="text-center">
                    <Wallet className="mx-auto h-16 w-16 text-muted-foreground" />
                    <h1 className="mt-4 text-2xl font-bold text-foreground">Coming Soon!</h1>
                    <p className="mt-2 text-muted-foreground">
                        We are upgrading your experience. Stay tuned!
                    </p>
                     <p className="mt-1 text-sm text-muted-foreground">
                        This feature will be available in a future update.
                    </p>
                </div>
            </main>
        </div>
        <BottomNav />
    </div>
  );
}
