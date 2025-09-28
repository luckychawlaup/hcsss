
"use client";

import { useState, useEffect } from "react";
import Header from "@/components/dashboard/Header";
import BottomNav from "@/components/dashboard/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import { getAnnouncementsForStudent, Announcement } from "@/lib/supabase/announcements";
import { getStudentByAuthId } from "@/lib/supabase/students";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Info, Send, Paperclip, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const supabase = createClient();

function AttachmentPreview({ url }: { url: string }) {
    const isImage = /\.(jpeg|jpg|gif|png|webp)$/i.test(url);

    return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center gap-2 rounded-md border bg-secondary p-2 text-sm text-secondary-foreground transition-colors hover:bg-secondary/80">
            <Paperclip className="h-4 w-4" /> 
            {isImage ? 'View Image' : 'View Attachment'}
        </a>
    )
}

function AnnouncementCard({ notice }: { notice: Announcement }) {
  const createdAt = notice.created_at ? new Date(notice.created_at) : new Date();
  
  return (
    <Card className="overflow-hidden">
        <CardHeader>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <CardTitle className="text-lg">{notice.title || "Announcement"}</CardTitle>
                     <div className="text-xs text-muted-foreground mt-1">
                        <span>{createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        {' at '}
                        <span>{createdAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>
                <Badge variant="secondary">{notice.category}</Badge>
            </div>
        </CardHeader>
        <CardContent>
            <p className="whitespace-pre-wrap">{notice.content}</p>
            {notice.attachment_url && <AttachmentPreview url={notice.attachment_url} />}
        </CardContent>
        <CardFooter className="bg-secondary/40 px-6 py-3">
             <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                    <AvatarFallback>{notice.creator_name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="text-sm font-semibold">{notice.creator_name}</p>
                    <p className="text-xs text-muted-foreground">{notice.creator_role}</p>
                </div>
            </div>
        </CardFooter>
    </Card>
  )
}

function AnnouncementSkeleton() {
    return (
        <>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </CardContent>
                 <CardFooter>
                     <Skeleton className="h-8 w-1/3" />
                 </CardFooter>
            </Card>
             <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                </CardContent>
                  <CardFooter>
                     <Skeleton className="h-8 w-1/3" />
                 </CardFooter>
            </Card>
        </>
    )
}

export default function NoticesPage() {
  const [notices, setNotices] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    let unsubscribeAnnouncements: any;

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        const user = session?.user;
        if (user) {
            const studentProfile = await getStudentByAuthId(user.id);
            if (studentProfile) {
                const classSection = `${studentProfile.class}-${studentProfile.section}`;
                const studentId = studentProfile.id;

                unsubscribeAnnouncements = getAnnouncementsForStudent(
                    { classSection, studentId },
                    (announcements) => {
                        // Sort by most recent first
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
                <AnnouncementCard key={notice.id} notice={notice} />
            ))
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
