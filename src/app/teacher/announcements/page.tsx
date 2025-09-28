
"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "@/components/dashboard/Header";
import TeacherNav from "@/components/teacher/TeacherNav";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getTeacherByAuthId, Teacher } from "@/lib/supabase/teachers";
import { Announcement, getAnnouncementsForClass, addAnnouncement, updateAnnouncement, deleteAnnouncement } from "@/lib/supabase/announcements";
import { Skeleton } from "@/components/ui/skeleton";
import ClassChatGroup from "@/components/teacher/ClassChatGroup";
import AnnouncementChat from "@/components/teacher/AnnouncementChat";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const supabase = createClient();

export default function TeacherAnnouncementsPage() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<User | null>(null);

  const assignedClasses = useMemo(() => {
    if (!teacher) return [];
    const classes = new Set<string>();
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
    if (selectedClass) {
      const unsubscribe = getAnnouncementsForClass(selectedClass, setAnnouncements);
      return () => {
          if (unsubscribe && typeof unsubscribe.unsubscribe === 'function') {
              unsubscribe.unsubscribe();
          }
      };
    } else {
      setAnnouncements([]);
    }
  }, [selectedClass]);
  
  const handleSelectClass = (classSection: string) => {
      setSelectedClass(classSection);
  }

  const handleSendMessage = async (content: string, category: string, file?: File) => {
    if (!teacher || !selectedClass) {
        toast({ variant: "destructive", title: "Error", description: "Cannot send message. Teacher or class not selected." });
        return;
    }

    const announcementData: Partial<Announcement> = {
        title: `${teacher.subject} Announcement`, // Or a more dynamic title
        content,
        category,
        target: "students",
        target_audience: {
            type: "class",
            value: selectedClass,
        },
        created_by: teacher?.id,
        creator_name: teacher?.name,
        creator_role: teacher.role === 'classTeacher' ? 'Class Teacher' : 'Subject Teacher',
    };
    
     try {
      await addAnnouncement(announcementData as Omit<Announcement, "id" | "created_at">, file);
      toast({
        title: "Announcement Sent!",
        description: `Your message has been sent to ${selectedClass}.`,
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
    <div className="p-4 border-b flex items-center gap-4">
        {isMobile && (
            <Button variant="ghost" size="icon" onClick={() => setSelectedClass(null)}>
                <ArrowLeft/>
            </Button>
        )}
        <h2 className="text-lg font-semibold">{selectedClass}</h2>
    </div>
  );


  return (
    <div className="flex min-h-screen w-full flex-col bg-background md:flex-row">
      <TeacherNav activeView="makeAnnouncement" setActiveView={() => {}} teacherRole={teacher?.role}/>
      <div className="flex flex-1 flex-col">
        <Header title="Announcements" showAvatar={true} />
        <main className="flex flex-1">
          {isMobile ? (
            <div className="w-full">
              {!selectedClass ? (
                 <ClassChatGroup 
                    assignedClasses={assignedClasses}
                    onSelectClass={handleSelectClass}
                    selectedClass={selectedClass}
                    isLoading={isLoading}
                />
              ) : (
                 <AnnouncementChat 
                    announcements={announcements}
                    chatTitle={selectedClass}
                    onSendMessage={handleSendMessage}
                    onUpdateMessage={handleUpdateMessage}
                    onDeleteMessage={handleDeleteMessage}
                    senderName={teacher?.name || "Teacher"}
                    senderRole={teacher?.role === 'classTeacher' ? 'Class Teacher' : 'Subject Teacher'}
                    headerContent={chatHeader}
                />
              )}
            </div>
          ) : (
            <div className="flex flex-1 md:grid md:grid-cols-[300px_1fr]">
              <div className="border-r">
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
                          onUpdateMessage={handleUpdateMessage}
                          onDeleteMessage={handleDeleteMessage}
                          senderName={teacher?.name || "Teacher"}
                          senderRole={teacher?.role === 'classTeacher' ? 'Class Teacher' : 'Subject Teacher'}
                      />
                  )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
