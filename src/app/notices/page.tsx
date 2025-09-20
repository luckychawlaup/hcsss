
"use client";

import { useState, useEffect } from "react";
import Header from "@/components/dashboard/Header";
import BottomNav from "@/components/dashboard/BottomNav";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getAnnouncements, Announcement } from "@/lib/firebase/announcements";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "@/lib/firebase";
import { getStudentByAuthId } from "@/lib/firebase/students";

const getCategoryVariant = (category: string) => {
  switch (category.toLowerCase()) {
    case "urgent":
      return "destructive";
    case "event":
      return "default";
    default:
      return "secondary";
  }
};

function AnnouncementSkeleton() {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <Skeleton className="h-6 w-48 mb-2" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                </div>
            </CardHeader>
            <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
            </CardContent>
        </Card>
    )
}

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
      <Header title="Notices" />
      <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
        <div className="mx-auto w-full max-w-4xl space-y-6">
          {isLoading ? (
            <>
                <AnnouncementSkeleton />
                <AnnouncementSkeleton />
                <AnnouncementSkeleton />
            </>
          ) : notices.length === 0 ? (
             <Card className="flex items-center justify-center p-8">
                 <p className="text-muted-foreground">No notices have been published yet.</p>
             </Card>
          ) : (
            notices.map((notice) => (
              <Card key={notice.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{notice.title}</CardTitle>
                      <CardDescription>
                        {new Date(notice.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                         {notice.creatorName && ` - from ${notice.creatorName}`}
                      </CardDescription>
                    </div>
                    <Badge variant={getCategoryVariant(notice.category)}>
                      {notice.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{notice.content}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
