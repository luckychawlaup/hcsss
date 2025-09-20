
"use client";

import { useState, useEffect } from "react";
import Header from "@/components/dashboard/Header";
import BottomNav from "@/components/dashboard/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import { getAnnouncementsForStudent, Announcement } from "@/lib/supabase/announcements";
import { getStudentByAuthId } from "@/lib/supabase/students";
import { Card } from "@/components/ui/card";
import { Info, Send, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

function AttachmentPreview({ url }: { url: string }) {
    const isImage = /\.(jpeg|jpg|gif|png|webp)$/i.test(url);

    return (
        <div className="mt-2">
            {isImage ? (
                <Image src={url} alt="Attachment" width={200} height={200} className="rounded-md object-cover" />
            ) : (
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 underline flex items-center gap-2">
                    <Paperclip className="h-4 w-4" /> View Attachment
                </a>
            )}
        </div>
    )
}

function AnnouncementBubble({ notice }: { notice: Announcement }) {
  const isSender = false; // Students are always receivers
  
  return (
    <div className={cn("flex items-end gap-2.5", isSender ? "justify-end" : "justify-start")}>
        {!isSender && (
             <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                 {notice.creator_name?.charAt(0)}
            </div>
        )}
        <div className={cn("flex flex-col gap-1 w-full max-w-[320px]")}>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <span className="text-xs font-semibold text-foreground">{notice.creator_name}</span>
                <span className="text-xs font-normal text-muted-foreground">{new Date(notice.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className={cn("p-3 rounded-lg", isSender ? "bg-primary text-primary-foreground rounded-ee-none" : "bg-secondary rounded-es-none")}>
                {notice.title && <p className="text-sm font-semibold pb-1">{notice.title}</p>}
                <p className="text-sm font-normal">{notice.content}</p>
                 {notice.attachment_url && <AttachmentPreview url={notice.attachment_url} />}
            </div>
             <span className="text-xs font-normal text-muted-foreground">{notice.creator_role} ({notice.category})</span>
        </div>
    </div>
  )
}

function AnnouncementSkeleton() {
    return (
        <>
            <div className="flex items-end gap-2.5 justify-start">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex flex-col gap-1 w-full max-w-[320px]">
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-16 w-full" />
                </div>
            </div>
             <div className="flex items-end gap-2.5 justify-end">
                <div className="flex flex-col gap-1 w-full max-w-[320px] items-end">
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-20 w-4/5" />
                </div>
                <Skeleton className="w-8 h-8 rounded-full" />
            </div>
        </>
    )
}

export default function NoticesPage() {
  const [notices, setNotices] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        const user = session?.user;
        if (user) {
            const studentProfile = await getStudentByAuthId(user.id);
            if (studentProfile) {
                const classSection = `${studentProfile.class}-${studentProfile.section}`;
                const studentId = studentProfile.id;

                const unsubscribeAnnouncements = getAnnouncementsForStudent(
                { classSection, studentId },
                (announcements) => {
                    setNotices(announcements);
                    setIsLoading(false);
                }
                );
                // Note: The Supabase realtime subscription needs to be manually unsubscribed.
                // The way getAnnouncementsForStudent is written, it should return the channel to unsubscribe.
                return () => {
                    // This is conceptual; actual implementation depends on getAnnouncementsForStudent
                    // For example: if (unsubscribeAnnouncements) unsubscribeAnnouncements.unsubscribe();
                };
            }
        }
        setIsLoading(false);
    });

    return () => {
        authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header title="Announcements" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 flex flex-col">
        <div className="mx-auto w-full max-w-2xl flex-1 space-y-6">
          {isLoading ? (
            <AnnouncementSkeleton />
          ) : notices.length === 0 ? (
             <Card className="flex flex-col items-center justify-center p-8 h-full text-center">
                 <Info className="h-10 w-10 text-muted-foreground mb-4"/>
                 <p className="text-muted-foreground font-semibold">No announcements yet!</p>
                 <p className="text-sm text-muted-foreground">Check back later for updates from the school.</p>
             </Card>
          ) : (
            notices.map((notice) => (
                <AnnouncementBubble key={notice.id} notice={notice} />
            ))
          )}
        </div>
        <div className="text-center text-xs text-muted-foreground pt-4 mt-auto">
            This is a one-way announcement channel. You cannot reply to these messages.
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
