
"use client";

import React, { useState, useRef, useEffect } from 'react';
import type { Announcement } from '@/lib/firebase/announcements';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Info, Megaphone } from 'lucide-react';

interface AnnouncementBubbleProps {
  notice: Announcement;
  isSender: boolean;
}

function AnnouncementBubble({ notice, isSender }: AnnouncementBubbleProps) {
  return (
    <div className={cn("flex items-end gap-2.5", isSender ? "justify-end" : "justify-start")}>
      {!isSender && (
        <Avatar className="h-8 w-8">
          <AvatarFallback>{notice.creatorName?.charAt(0)}</AvatarFallback>
        </Avatar>
      )}
      <div className={cn("flex flex-col gap-1 w-full max-w-xs md:max-w-md")}>
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          {!isSender && <span className="text-xs font-semibold text-foreground">{notice.creatorName}</span>}
          <span className="text-xs font-normal text-muted-foreground">
            {new Date(notice.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className={cn("p-3 rounded-lg shadow-sm", isSender ? "bg-primary text-primary-foreground rounded-ee-none" : "bg-secondary rounded-es-none")}>
          {notice.title && <p className="text-sm font-semibold pb-1">{notice.title}</p>}
          <p className="text-sm font-normal">{notice.content}</p>
        </div>
        <span className="text-xs font-normal text-muted-foreground">{notice.creatorRole} ({notice.category})</span>
      </div>
    </div>
  );
}

interface AnnouncementChatProps {
  announcements: Announcement[];
  chatTitle: string | null;
  onSendMessage: (content: string, category: string) => Promise<void>;
  senderName: string;
  senderRole: string;
  headerContent?: React.ReactNode;
}

export default function AnnouncementChat({ announcements, chatTitle, onSendMessage, senderName, senderRole, headerContent }: AnnouncementChatProps) {
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("General");
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [announcements]);

  const handleSend = async () => {
    if (!message.trim()) return;
    setIsSending(true);
    await onSendMessage(message, category);
    setMessage("");
    setIsSending(false);
  };

  if (!chatTitle) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
        <Megaphone className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Select a Class</h3>
        <p className="text-muted-foreground mt-2">Choose a class from the list to view announcements or send a new one.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {headerContent}
      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto p-4 space-y-6">
        {announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center h-full">
            <Info className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Announcements Yet</h3>
            <p className="text-muted-foreground mt-2">Be the first to send an announcement to {chatTitle}.</p>
          </div>
        ) : (
          announcements.map(notice => (
            <AnnouncementBubble key={notice.id} notice={notice} isSender={notice.creatorName === senderName} />
          ))
        )}
      </div>
      <div className="p-4 border-t bg-background">
        <div className="flex items-center gap-2">
            <Input
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={`Message ${chatTitle}...`}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                disabled={isSending}
                className="flex-1"
            />
             <Input
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="Category"
                disabled={isSending}
                className="w-28"
            />
            <Button onClick={handleSend} disabled={isSending || !message.trim()}>
                <Send />
            </Button>
        </div>
      </div>
    </div>
  );
}
