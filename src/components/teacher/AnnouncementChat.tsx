
"use client";

import React, { useState, useRef, useEffect } from 'react';
import type { Announcement } from '@/lib/firebase/announcements';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Info, Megaphone, Paperclip, X, MoreVertical, Edit, Trash2 } from 'lucide-react';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";


interface AnnouncementBubbleProps {
  notice: Announcement;
  isSender: boolean;
  onEdit: (notice: Announcement) => void;
  onDelete: (noticeId: string) => void;
}

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

function AnnouncementBubble({ notice, isSender, onEdit, onDelete }: AnnouncementBubbleProps) {
  const isRecent = (Date.now() - notice.createdAt.toMillis()) < 15 * 60 * 1000; // 15 minutes

  return (
    <div className={cn("flex items-end gap-2.5 group", isSender ? "justify-end" : "justify-start")}>
      {!isSender && (
        <Avatar className="h-8 w-8">
          <AvatarFallback>{notice.creatorName?.charAt(0)}</AvatarFallback>
        </Avatar>
      )}
      <div className={cn("flex flex-col gap-1 w-full max-w-xs md:max-w-md")}>
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          {!isSender && <span className="text-xs font-semibold text-foreground">{notice.creatorName}</span>}
          <span className="text-xs font-normal text-muted-foreground">
            {notice.createdAt.toDate().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className={cn("relative p-3 rounded-lg shadow-sm", isSender ? "bg-primary text-primary-foreground rounded-ee-none" : "bg-secondary rounded-es-none")}>
          {notice.title && <p className="text-sm font-semibold pb-1">{notice.title}</p>}
          <p className="text-sm font-normal whitespace-pre-wrap">{notice.content}</p>
          {notice.attachmentUrl && <AttachmentPreview url={notice.attachmentUrl} />}
          {notice.editedAt && <span className="text-xs text-white/70 pl-2">(edited)</span>}
        </div>
        <span className="text-xs font-normal text-muted-foreground">{notice.creatorRole} ({notice.category})</span>
      </div>
      {isSender && isRecent && (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                    <MoreVertical className="h-4 w-4"/>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onEdit(notice)}>
                    <Edit className="mr-2 h-4 w-4"/> Edit
                </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => onDelete(notice.id)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4"/> Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

interface AnnouncementChatProps {
  announcements: Announcement[];
  chatTitle: string | null;
  onSendMessage: (content: string, category: string, file?: File) => Promise<void>;
  onUpdateMessage: (id: string, content: string) => Promise<void>;
  onDeleteMessage: (id: string) => Promise<void>;
  senderName: string;
  senderRole: string;
  headerContent?: React.ReactNode;
}

export default function AnnouncementChat({ announcements, chatTitle, onSendMessage, onUpdateMessage, onDeleteMessage, senderName, senderRole, headerContent }: AnnouncementChatProps) {
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("General");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [editingMessage, setEditingMessage] = useState<Announcement | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [announcements]);

  useEffect(() => {
    // When switching chats, cancel any ongoing edits
    cancelEdit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatTitle]);

  const handleSend = async () => {
    if (!message.trim() && !attachment) return;
    setIsSending(true);

    if(editingMessage) {
        await onUpdateMessage(editingMessage.id, message);
        setEditingMessage(null);
    } else {
        await onSendMessage(message, category, attachment || undefined);
    }

    setMessage("");
    setAttachment(null);
    setCategory("General");
    if(fileInputRef.current) fileInputRef.current.value = "";
    setIsSending(false);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert("File size cannot exceed 2MB.");
        return;
      }
      setAttachment(file);
    }
  }

  const handleEdit = (notice: Announcement) => {
    setEditingMessage(notice);
    setMessage(notice.content);
    setCategory(notice.category);
  }

  const cancelEdit = () => {
    setEditingMessage(null);
    setMessage("");
    setCategory("General");
  }
  
  const confirmDelete = async () => {
      if (deletingMessageId) {
          await onDeleteMessage(deletingMessageId);
          setDeletingMessageId(null);
      }
  }


  if (!chatTitle) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
        <Megaphone className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Select a Group</h3>
        <p className="text-muted-foreground mt-2">Choose a class or group from the list to view announcements or send a new one.</p>
      </div>
    );
  }

  return (
    <>
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
            <AnnouncementBubble 
                key={notice.id} 
                notice={notice} 
                isSender={notice.creatorName === senderName} 
                onEdit={handleEdit}
                onDelete={setDeletingMessageId}
            />
          ))
        )}
      </div>
      <div className="p-4 border-t bg-background">
        {attachment && !editingMessage && (
            <div className="flex items-center gap-2 p-2 mb-2 bg-secondary rounded-md text-sm">
                <Paperclip className="h-4 w-4" />
                <span>{attachment.name}</span>
                <button onClick={() => { setAttachment(null); if(fileInputRef.current) fileInputRef.current.value = ""; }} className="ml-auto">
                    <X className="h-4 w-4" />
                </button>
            </div>
        )}
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isSending || !!editingMessage}>
                <Paperclip/>
            </Button>
             <Input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept="image/*,application/pdf"
            />
            <Input
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={editingMessage ? "Editing message..." : `Message ${chatTitle}...`}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                disabled={isSending}
                className="flex-1"
            />
             <Input
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="Category"
                disabled={isSending || !!editingMessage}
                className="w-28"
            />
            <Button onClick={handleSend} disabled={isSending || (!message.trim() && !attachment)}>
                <Send />
            </Button>
            {editingMessage && (
                <Button variant="ghost" onClick={cancelEdit}>Cancel</Button>
            )}
        </div>
      </div>
    </div>
    <AlertDialog open={!!deletingMessageId} onOpenChange={() => setDeletingMessageId(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete this announcement for everyone. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
