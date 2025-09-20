
"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "@/components/dashboard/Header";
import TeacherNav from "@/components/teacher/TeacherNav";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "@/lib/firebase";
import { getTeacherByAuthId, Teacher } from "@/lib/firebase/teachers";
import { Announcement, getAnnouncementsForClass } from "@/lib/firebase/announcements";
import { Skeleton } from "@/components/ui/skeleton";
import ClassChatGroup from "@/components/teacher/ClassChatGroup";
import AnnouncementChat from "@/components/teacher/AnnouncementChat";
import { addAnnouncement } from "@/lib/firebase/announcements";
import { useToast } from "@/hooks/use-toast";

export default function TeacherAnnouncementsPage() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const auth = getAuth(app);
  const { toast } = useToast();

  const assignedClasses = useMemo(() => {
    if (!teacher) return [];
    const classes = new Set<string>();
    if (teacher.classTeacherOf) classes.add(teacher.classTeacherOf);
    if (teacher.classesTaught) teacher.classesTaught.forEach(c => classes.add(c));
    return Array.from(classes).sort();
  }, [teacher]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const teacherProfile = await getTeacherByAuthId(user.uid);
        setTeacher(teacherProfile);
      } else {
        setTeacher(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribeAuth();
  }, [auth]);

  useEffect(() => {
    if (selectedClass) {
      const unsubscribe = getAnnouncementsForClass(selectedClass, setAnnouncements);
      return () => unsubscribe();
    }
  }, [selectedClass]);
  
  const handleSelectClass = (classSection: string) => {
      setSelectedClass(classSection);
  }

  const handleSendMessage = async (content: string, category: string) => {
    if (!teacher || !selectedClass) {
        toast({ variant: "destructive", title: "Error", description: "Cannot send message. Teacher or class not selected." });
        return;
    }

    const announcementData = {
        title: `${teacher.subject} Announcement`, // Or a more dynamic title
        content,
        category,
        target: "students" as const,
        targetAudience: {
            type: "class" as const,
            value: selectedClass,
        },
        createdBy: teacher?.id,
        creatorName: teacher?.name,
        creatorRole: "Teacher" as const,
    };
    
     try {
      await addAnnouncement(announcementData as any);
      toast({
        title: "Announcement Sent!",
        description: `Your message has been sent to ${selectedClass}.`,
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "Could not send announcement." });
    }
  }


  return (
    <div className="flex min-h-screen w-full flex-col bg-background md:flex-row">
      <TeacherNav activeView="makeAnnouncement" setActiveView={() => {}} />
      <div className="flex flex-1 flex-col">
        <Header title="Announcements" showAvatar={true} />
        <main className="flex flex-1 md:grid md:grid-cols-[300px_1fr]">
            <div className="border-b md:border-b-0 md:border-r">
                <ClassChatGroup 
                    assignedClasses={assignedClasses}
                    onSelectClass={handleSelectClass}
                    selectedClass={selectedClass}
                    isLoading={isLoading}
                />
            </div>
            <div className="flex flex-col">
                {isLoading ? (
                    <div className="flex-1 p-4 space-y-4">
                        <Skeleton className="h-16 w-2/3" />
                        <Skeleton className="h-16 w-3/4 self-end" />
                        <Skeleton className="h-12 w-1/2" />
                    </div>
                ) : (
                    <AnnouncementChat 
                        announcements={announcements}
                        chatTitle={selectedClass}
                        onSendMessage={handleSendMessage}
                        senderName={teacher?.name || "Teacher"}
                        senderRole="Teacher"
                    />
                )}
            </div>
        </main>
      </div>
    </div>
  );
}
