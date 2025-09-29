
"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "@/components/dashboard/Header";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Announcement, addAnnouncement, updateAnnouncement, deleteAnnouncement, getAnnouncementsForClass, getAnnouncementsForAllStudents, getAnnouncementsForTeachers } from "@/lib/supabase/announcements";
import { Skeleton } from "@/components/ui/skeleton";
import ClassChatGroup from "@/components/teacher/ClassChatGroup";
import AnnouncementChat from "@/components/teacher/AnnouncementChat";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const supabase = createClient();

const classes = ["Nursery", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const sections = ["A", "B", "C", "D"];
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

  const handleSendMessage = async (content: string, category: string, file?: File) => {
    if (!user || !selectedGroup) {
        toast({ variant: "destructive", title: "Error", description: "No group selected." });
        return;
    }

    const announcementData: Partial<Announcement> = {
        title: "Announcement",
        content,
        category,
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
        {isMobile && (
            <Button variant="ghost" size="icon" onClick={() => setSelectedGroup(null)}>
                <ArrowLeft/>
            </Button>
        )}
        <h2 className="text-lg font-semibold">{selectedGroup}</h2>
    </div>
  );

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <Header title="Make Announcement" showAvatar={false} />
      <main className="flex-1 overflow-hidden md:grid md:grid-cols-[300px_1fr]">
        <div className="border-b md:border-b-0 md:border-r h-full">
            {isMobile && selectedGroup ? null : (
                <ClassChatGroup 
                    assignedClasses={announcementGroups}
                    onSelectClass={setSelectedGroup}
                    selectedClass={selectedGroup}
                    isLoading={!user}
                />
            )}
        </div>
        <div className="flex flex-col h-full">
             {isMobile && !selectedGroup ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                    <Megaphone className="h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">Select a Group</h3>
                    <p className="text-muted-foreground mt-2">Choose a group to start sending announcements.</p>
                </div>
             ) : (
                <AnnouncementChat 
                    announcements={announcements}
                    chatTitle={selectedGroup}
                    onSendMessage={handleSendMessage}
                    onUpdateMessage={handleUpdateMessage}
                    onDeleteMessage={handleDeleteMessage}
                    senderName={"Principal"}
                    senderRole={"Principal"}
                    headerContent={isMobile ? chatHeader : undefined}
                />
             )}
        </div>
      </main>
    </div>
  );
}
