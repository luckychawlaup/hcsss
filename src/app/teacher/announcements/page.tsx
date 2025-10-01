
"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "@/components/dashboard/Header";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getTeacherByAuthId, Teacher } from "@/lib/supabase/teachers";
import { Announcement, addAnnouncement, updateAnnouncement, deleteAnnouncement, getAnnouncementsForClass, getAnnouncementsForTeachers } from "@/lib/supabase/announcements";
import ClassChatGroup from "@/components/teacher/ClassChatGroup";
import AnnouncementChat from "@/components/teacher/AnnouncementChat";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import TeacherNav from "@/components/teacher/TeacherNav";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const supabase = createClient();

export default function TeacherAnnouncementsPage() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<User | null>(null);

  const announcementGroups = useMemo(() => {
    if (!teacher) return [];
    const classes = new Set<string>();
    classes.add("All Teachers"); // Add static group for all teachers
    if (teacher.class_teacher_of) classes.add(teacher.class_teacher_of);
    if (teacher.classes_taught) teacher.classes_taught.forEach(c => classes.add(c));
    return Array.from(classes).sort();
  }, [teacher]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
            const teacherProfile = await getTeacherByAuthId(currentUser.id);
            setTeacher(teacherProfile);
        } else {
            setTeacher(null);
        }
        setIsLoading(false);
    });

    return () => {
        authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (selectedGroup) {
        let unsubscribe: any;
        if (selectedGroup === 'All Teachers') {
            unsubscribe = getAnnouncementsForTeachers(setAnnouncements);
        } else {
            unsubscribe = getAnnouncementsForClass(selectedGroup, setAnnouncements);
        }
      return () => {
          if (unsubscribe && typeof unsubscribe.unsubscribe === 'function') {
              unsubscribe.unsubscribe();
          }
      };
    } else {
      setAnnouncements([]);
    }
  }, [selectedGroup]);
  
  const handleSelectGroup = (group: string) => {
      setSelectedGroup(group);
  }

  const handleSendMessage = async (content: string, category: string, file?: File) => {
    if (!teacher || !selectedGroup) {
        toast({ variant: "destructive", title: "Error", description: "Cannot send message. Teacher or group not selected." });
        return;
    }

    const announcementData: Partial<Announcement> = {
        title: "Announcement",
        content,
        category,
        created_by: teacher?.id,
        creator_name: teacher?.name,
        creator_role: teacher.role === 'classTeacher' ? 'Class Teacher' : 'Subject Teacher',
    };

    if (selectedGroup === 'All Teachers') {
        announcementData.target = 'teachers';
        announcementData.target_audience = undefined;
    } else {
        announcementData.target = 'students';
        announcementData.target_audience = { type: 'class', value: selectedGroup };
    }
    
     try {
      await addAnnouncement(announcementData as Omit<Announcement, "id" | "created_at">, file);
      toast({
        title: "Announcement Sent!",
        description: `Your message has been sent to ${selectedGroup}.`,
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "Could not send announcement." });
    }
  }

   const handleUpdateMessage = async (id: string, content: string) => {
      try {
        await updateAnnouncement(id, content);
        toast({ title: "Announcement Updated" });
      } catch (e: any) {
        toast({ variant: "destructive", title: "Error", description: "Could not update announcement." });
      }
  }

  const handleDeleteMessage = async (id: string) => {
       try {
        await deleteAnnouncement(id);
        toast({ title: "Announcement Deleted" });
      } catch (e: any) {
        toast({ variant: "destructive", title: "Error", description: "Could not delete announcement." });
      }
  }
  
  const chatHeader = (
    <div className="p-4 border-b flex items-center gap-4 bg-background z-10">
        <Button variant="ghost" size="icon" onClick={() => setSelectedGroup(null)}>
            <ArrowLeft/>
        </Button>
        <h2 className="text-lg font-semibold">{selectedGroup}</h2>
    </div>
  );

  const mainContent = isMobile ? (
    <div className="w-full h-full flex flex-col">
      {!selectedGroup ? (
        <ClassChatGroup
          assignedClasses={announcementGroups}
          onSelectClass={handleSelectGroup}
          selectedClass={selectedGroup}
          isLoading={isLoading}
        />
      ) : (
        <AnnouncementChat
            announcements={announcements}
            chatTitle={selectedGroup}
            onSendMessage={handleSendMessage}
            onUpdateMessage={handleUpdateMessage}
            onDeleteMessage={handleDeleteMessage}
            senderName={teacher?.name || "Teacher"}
            senderRole={
                teacher?.role === "classTeacher" ? "Class Teacher" : "Subject Teacher"
            }
            headerContent={chatHeader}
        />
      )}
    </div>
  ) : (
    <div className="flex h-full">
      <div className="w-[300px] border-r">
        <ClassChatGroup
          assignedClasses={announcementGroups}
          onSelectClass={handleSelectGroup}
          selectedClass={selectedGroup}
          isLoading={isLoading}
        />
      </div>
      <div className="flex-1">
        <AnnouncementChat
          announcements={announcements}
          chatTitle={selectedGroup}
          onSendMessage={handleSendMessage}
          onUpdateMessage={handleUpdateMessage}
          onDeleteMessage={handleDeleteMessage}
          senderName={teacher?.name || "Teacher"}
          senderRole={
            teacher?.role === "classTeacher" ? "Class Teacher" : "Subject Teacher"
          }
        />
      </div>
    </div>
  );


  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <Header title="Announcements" showAvatar={true} />
      <main className="flex-1 overflow-hidden p-0 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-6xl h-full flex flex-col">
            <Card className="flex-1 overflow-hidden">
                 <CardContent className="p-0 h-full">
                    {mainContent}
                </CardContent>
            </Card>
        </div>
      </main>
      {!selectedGroup && (
        <TeacherNav activeView="makeAnnouncement" setActiveView={() => {}} teacherRole={teacher?.role} />
      )}
    </div>
  );
}
