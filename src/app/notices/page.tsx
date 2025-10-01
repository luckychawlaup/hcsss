
"use client";

import { useState, useEffect } from "react";
import Header from "@/components/dashboard/Header";
import BottomNav from "@/components/dashboard/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import { getAnnouncementsForStudent, Announcement } from "@/lib/supabase/announcements";
import { getStudentByAuthId } from "@/lib/supabase/students";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import AnnouncementChat from "@/components/teacher/AnnouncementChat";
import type { Student } from "@/lib/supabase/students";


const supabase = createClient();

function AnnouncementSkeleton() {
    return (
        <div className="p-4 space-y-4">
            <Skeleton className="h-20 w-3/4" />
            <Skeleton className="h-24 w-1/2 self-end" />
            <Skeleton className="h-16 w-2/3" />
        </div>
    )
}

export default function NoticesPage() {
  const [notices, setNotices] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);

  useEffect(() => {
    setIsLoading(true);
    let unsubscribeAnnouncements: any;

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        const user = session?.user;
        if (user) {
            const studentProfile = await getStudentByAuthId(user.id);
            setStudent(studentProfile);
            if (studentProfile) {
                const classSection = `${studentProfile.class}-${studentProfile.section}`;
                const studentId = studentProfile.id;

                unsubscribeAnnouncements = getAnnouncementsForStudent(
                    { classSection, studentId },
                    (announcements) => {
                        const sorted = announcements.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                        setNotices(sorted);
                        setIsLoading(false);
                    }
                );
            }
        } else {
            setIsLoading(false);
        }
    });

    return () => {
        authListener.subscription.unsubscribe();
        if (unsubscribeAnnouncements && typeof unsubscribeAnnouncements.unsubscribe === 'function') {
            unsubscribeAnnouncements.unsubscribe();
        }
    };
  }, []);

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <Header title="All Announcements" />
      <main className="flex-1 overflow-hidden p-0">
          <Card className="h-full w-full border-0 rounded-none">
            <CardContent className="p-0 h-full">
               {isLoading ? (
                    <AnnouncementSkeleton />
                ) : (
                    <AnnouncementChat 
                        announcements={notices}
                        chatTitle="All Announcements"
                        senderName={student?.name || ''}
                        readOnly={true}
                    />
                )}
            </CardContent>
        </Card>
      </main>
      <BottomNav />
    </div>
  );
}

