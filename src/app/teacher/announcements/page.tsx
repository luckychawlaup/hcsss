
"use client";

import { useState, useEffect } from "react";
import Header from "@/components/dashboard/Header";
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

export default function TeacherAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = getAnnouncements("teachers", (announcements) => {
      setAnnouncements(announcements);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header title="Announcements" />
      <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-4xl space-y-6">
          {isLoading ? (
            <>
                <AnnouncementSkeleton />
                <AnnouncementSkeleton />
                <AnnouncementSkeleton />
            </>
          ) : announcements.length === 0 ? (
             <Card className="flex items-center justify-center p-8">
                 <p className="text-muted-foreground">No announcements have been published for you yet.</p>
             </Card>
          ) : (
            announcements.map((announcement) => (
              <Card key={announcement.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{announcement.title}</CardTitle>
                      <CardDescription>
                        {new Date(announcement.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </CardDescription>
                    </div>
                    <Badge variant={getCategoryVariant(announcement.category)}>
                      {announcement.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{announcement.content}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
