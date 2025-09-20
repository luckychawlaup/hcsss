
"use client";

import { useState, useEffect } from "react";
import Header from "@/components/dashboard/Header";
import {
  Card,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAnnouncements, Announcement, getAllAnnouncements } from "@/lib/firebase/announcements";
import TeacherNav from "@/components/teacher/TeacherNav";
import MakeTeacherAnnouncementForm from "@/components/teacher/MakeTeacherAnnouncementForm";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "@/lib/firebase";
import { getTeacherByAuthId, Teacher } from "@/lib/firebase/teachers";
import { getStudentsForTeacher, Student } from "@/lib/firebase/students";
import { cn } from "@/lib/utils";
import { Info, Megaphone } from "lucide-react";


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

export default function TeacherAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [assignedStudents, setAssignedStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const auth = getAuth(app);


  useEffect(() => {
    setIsLoading(true);
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const teacherProfile = await getTeacherByAuthId(user.uid);
        setTeacher(teacherProfile);
        if (teacherProfile) {
            getStudentsForTeacher(teacherProfile, setAssignedStudents);
            const unsubscribeAnnouncements = getAnnouncements("teachers", null, (announcements) => {
                setAnnouncements(announcements.filter(a => !a.targetAudience)); // Only show general announcements for teachers
                setIsLoading(false);
            });
             return () => unsubscribeAnnouncements();
        } else {
            setIsLoading(false);
        }
      } else {
        setTeacher(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [auth]);


  return (
     <div className="flex min-h-screen w-full flex-col bg-background md:flex-row">
        <TeacherNav activeView="makeAnnouncement" setActiveView={() => {}} />
        <div className="flex flex-1 flex-col">
            <Header title="Announcements" showAvatar={true} />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col">
                 <div className="mx-auto w-full max-w-4xl flex-1 flex flex-col">
                    <h2 className="text-2xl font-bold flex items-center gap-2 mb-4"><Megaphone/> School-Wide Announcements</h2>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-4 h-96 mb-8">
                    {isLoading ? (
                        <>
                            <AnnouncementSkeleton />
                            <AnnouncementSkeleton />
                        </>
                    ) : announcements.length === 0 ? (
                        <Card className="flex flex-col items-center justify-center p-8 h-full text-center">
                            <Info className="h-10 w-10 text-muted-foreground mb-4"/>
                            <p className="text-muted-foreground font-semibold">No school-wide announcements</p>
                            <p className="text-sm text-muted-foreground">Check back later for updates from the administration.</p>
                        </Card>
                    ) : (
                        announcements.map((notice) => (
                            <div key={notice.id} className={cn("flex flex-col gap-1 p-3 rounded-lg shadow-sm", getCategoryStyles(notice.category))}>
                                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                    <span className="text-sm font-semibold text-foreground">{notice.creatorName}</span>
                                    <span className="text-xs font-normal text-muted-foreground">{notice.creatorRole}</span>
                                    <span className="text-xs font-normal text-muted-foreground">{new Date(notice.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-sm font-semibold text-foreground py-1">{notice.title}</p>
                                <p className="text-sm font-normal text-muted-foreground">{notice.content}</p>
                            </div>
                        ))
                    )}
                    </div>

                    <div className="mt-auto flex-shrink-0">
                         <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">Send to Students</h2>
                        <MakeTeacherAnnouncementForm teacher={teacher} students={assignedStudents} />
                    </div>
                </div>
            </main>
        </div>
    </div>
  );
}
