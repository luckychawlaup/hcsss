
"use client";

import { useState, useEffect } from "react";
import Header from "@/components/dashboard/Header";
import TeacherNav from "@/components/teacher/TeacherNav";
import { Skeleton } from "@/components/ui/skeleton";
import { getAnnouncementsForTeachers, Announcement } from "@/lib/supabase/announcements";
import { Card, CardContent } from "@/components/ui/card";
import { getTeacherByAuthId } from "@/lib/supabase/teachers";
import type { Teacher } from "@/lib/supabase/teachers";
import { createClient } from "@/lib/supabase/client";
import AnnouncementChat from "@/components/teacher/AnnouncementChat";

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

export default function TeacherNoticesPage() {
  const [notices, setNotices] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [teacher, setTeacher] = useState<Teacher | null>(null);

  useEffect(() => {
    setIsLoading(true);
    
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if(session?.user) {
            const profile = await getTeacherByAuthId(session.user.id);
            setTeacher(profile);
        }
    });

    const unsubscribe = getAnnouncementsForTeachers((announcements) => {
        const sorted = announcements.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setNotices(sorted);
        setIsLoading(false);
    });

    return () => {
        if (unsubscribe && typeof unsubscribe.unsubscribe === 'function') {
            unsubscribe.unsubscribe();
        }
        authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <Header title="Official Announcements" />
      <main className="flex-1 overflow-hidden p-0">
         <Card className="h-full w-full border-0 rounded-none">
            <CardContent className="p-0 h-full">
              {isLoading ? (
                <AnnouncementSkeleton />
              ) : (
                <AnnouncementChat 
                    announcements={notices}
                    chatTitle="Official Announcements"
                    senderName={teacher?.name || ""}
                    readOnly={true}
                />
              )}
            </CardContent>
        </Card>
      </main>
      <TeacherNav activeView="dashboard" setActiveView={() => {}} />
    </div>
  );
}
