
"use client";

import { useState, useEffect } from "react";
import Header from "@/components/dashboard/Header";
import BottomNav from "@/components/dashboard/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import { getAnnouncements, Announcement } from "@/lib/firebase/announcements";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "@/lib/firebase";
import { getStudentByAuthId } from "@/lib/firebase/students";
import { Card } from "@/components/ui/card";
import { Info } from "lucide-react";

function AnnouncementSkeleton() {
    return (
        <div className="flex items-end gap-2.5">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex flex-col gap-1 w-full max-w-[320px]">
                <Skeleton className="h-4 w-24" />
                <div className="p-3 rounded-e-xl rounded-es-xl bg-muted">
                    <Skeleton className="h-4 w-64 mb-2" />
                    <Skeleton className="h-4 w-48" />
                </div>
            </div>
        </div>
    )
}

const getCategoryStyles = (category: string) => {
    switch (category.toLowerCase()) {
        case "urgent":
        return "bg-destructive/10 border-l-4 border-destructive";
        case "event":
        return "bg-primary/10 border-l-4 border-primary";
        default:
        return "bg-secondary border-l-4 border-secondary-foreground";
    }
};

export default function NoticesPage() {
  const [notices, setNotices] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const auth = getAuth(app);

  useEffect(() => {
    setIsLoading(true);

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
          const studentProfile = await getStudentByAuthId(user.uid);
          if (studentProfile) {
            const classSection = `${studentProfile.class}-${studentProfile.section}`;
            const studentId = studentProfile.id;

            const unsubscribeAnnouncements = getAnnouncements(
              "students",
              { classSection, studentId },
              (announcements) => {
                setNotices(announcements);
                setIsLoading(false);
              }
            );

            return () => unsubscribeAnnouncements();
          }
      }
       setIsLoading(false);
    });

    return () => unsubscribeAuth();
  }, [auth]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header title="Announcements" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 flex flex-col">
        <div className="mx-auto w-full max-w-2xl flex-1 space-y-6">
          {isLoading ? (
            <>
                <AnnouncementSkeleton />
                <AnnouncementSkeleton />
                <AnnouncementSkeleton />
            </>
          ) : notices.length === 0 ? (
             <Card className="flex flex-col items-center justify-center p-8 h-full text-center">
                 <Info className="h-10 w-10 text-muted-foreground mb-4"/>
                 <p className="text-muted-foreground font-semibold">No announcements yet!</p>
                 <p className="text-sm text-muted-foreground">Check back later for updates from the school.</p>
             </Card>
          ) : (
            notices.map((notice) => (
                <div key={notice.id} className={cn("flex flex-col gap-1 p-3 rounded-lg shadow-sm", getCategoryStyles(notice.category))}>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <span className="text-sm font-semibold text-foreground">{notice.creatorName}</span>
                        <span className="text-xs font-normal text-muted-foreground">{notice.creatorRole || ''}</span>
                        <span className="text-xs font-normal text-muted-foreground">{new Date(notice.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground py-1">{notice.title}</p>
                    <p className="text-sm font-normal text-muted-foreground">{notice.content}</p>
                </div>
            ))
          )}
        </div>
        <div className="text-center text-xs text-muted-foreground py-4 mt-auto">
            This is a one-way announcement channel. You cannot reply to these messages.
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

