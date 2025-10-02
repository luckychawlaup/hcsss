

"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "@/components/dashboard/Header";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Announcement, addAnnouncement, updateAnnouncement, deleteAnnouncement, getAnnouncementsForClass, getAnnouncementsForAllStudents, getAnnouncementsForTeachers } from "@/lib/supabase/announcements";
import ClassChatGroup from "@/components/teacher/ClassChatGroup";
import AnnouncementChat from "@/components/teacher/AnnouncementChat";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const supabase = createClient();

const classes = ["Nursery", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const sections = ["A", "B"];
const allClassSections = classes.flatMap(c => sections.map(s => `${c}-${s}`));

export default function PrincipalAnnouncementsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const announcementGroups = useMemo(() => ["All Students", "All Teachers", ...allClassSections], []);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedGroup) {
      setAnnouncements([]);
      return;
    }

    let unsubscribe: any;
    if (selectedGroup === 'All Teachers') {
      unsubscribe = getAnnouncementsForTeachers(setAnnouncements);
    } else if (selectedGroup === 'All Students') {
      unsubscribe = getAnnouncementsForAllStudents(setAnnouncements);
    } else {
      unsubscribe = getAnnouncementsForClass(selectedGroup, setAnnouncements);
    }
    
    return () => {
      if (unsubscribe && typeof unsubscribe.unsubscribe === 'function') {
        unsubscribe.unsubscribe();
      }
    };
  }, [selectedGroup]);

  const handleSendMessage = async (content: string, file?: File) => {
    if (!user || !selectedGroup) {
        toast({ variant: "destructive", title: "Error", description: "No group selected." });
        return;
    }

    const announcementData: Partial<Announcement> = {
        content,
        created_by: user.id,
        creator_name: "Principal",
        creator_role: "Principal",
    };

    if (selectedGroup === 'All Teachers') {
        announcementData.target = 'teachers';
        announcementData.target_audience = undefined;
    } else if (selectedGroup === 'All Students') {
        announcementData.target = 'students';
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
    <div className="p-4 border-b flex items-center gap-4">
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
          onSelectClass={setSelectedGroup}
          selectedClass={selectedGroup}
          isLoading={!user}
        />
      ) : (
        <AnnouncementChat
          announcements={announcements}
          chatTitle={selectedGroup}
          onSendMessage={handleSendMessage}
          onUpdateMessage={handleUpdateMessage}
          onDeleteMessage={handleDeleteMessage}
          senderName={"Principal"}
          senderRole={"Principal"}
          headerContent={chatHeader}
        />
      )}
    </div>
  ) : (
    <div className="flex h-full">
      <div className="w-[300px] border-r">
        <ClassChatGroup
          assignedClasses={announcementGroups}
          onSelectClass={setSelectedGroup}
          selectedClass={selectedGroup}
          isLoading={!user}
        />
      </div>
      <div className="flex-1">
        <AnnouncementChat
          announcements={announcements}
          chatTitle={selectedGroup}
          onSendMessage={handleSendMessage}
          onUpdateMessage={handleUpdateMessage}
          onDeleteMessage={handleDeleteMessage}
          senderName={"Principal"}
          senderRole={"Principal"}
        />
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <Header title="Make Announcement" showAvatar={false} />
      <main className="flex-1 overflow-hidden p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-6xl h-full flex flex-col">
          <Card className="flex-1 overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Megaphone /> Make Announcement</CardTitle>
              <CardDescription>Select a group to send an announcement to.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-110px)]">
                <div className="border-t h-full">
                    {mainContent}
                </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
