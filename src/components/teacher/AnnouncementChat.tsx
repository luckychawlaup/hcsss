
"use client";

import React, { useState, useRef, useEffect } from 'react';
import type { Announcement } from '@/lib/supabase/announcements';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Info, Megaphone, Paperclip, X, MoreVertical, Edit, Trash2, FileText, ImageIcon } from 'lucide-react';
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
  onEdit?: (notice: Announcement) => void;
  onDelete?: (noticeId: string) => void;
  readOnly?: boolean;
  showCategory?: boolean;
}

function AttachmentPreview({ url }: { url: string }) {
    const isImage = /\.(jpeg|jpg|gif|png|webp)$/i.test(url);

    return (
        <div className="mt-2">
            {isImage ? (
                <a href={url} target="_blank" rel="noopener noreferrer" className="relative rounded-lg overflow-hidden bg-black/5 block w-48 h-48">
                  <Image 
                    src={url} 
                    alt="Attachment" 
                    layout="fill"
                    objectFit="cover"
                    className="rounded-lg" 
                  />
                </a>
            ) : (
                <a 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-2 p-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors max-w-xs"
                >
                    <FileText className="h-4 w-4" />
                    <span className="text-xs font-medium truncate">View Attachment</span>
                </a>
            )}
        </div>
    )
}

function AnnouncementBubble({ notice, isSender, onEdit, onDelete, readOnly, showCategory = true }: AnnouncementBubbleProps) {
  const createdAt = notice.created_at ? new Date(notice.created_at) : new Date();
  const isRecent = (Date.now() - createdAt.getTime()) < 15 * 60 * 1000;

  return (
    <div className={cn("flex items-start gap-2.5 group animate-in fade-in-0 slide-in-from-bottom-2", isSender ? "justify-end" : "justify-start")}>
      {!isSender && (
        <Avatar className="h-8 w-8 flex-shrink-0 ring-1 ring-background">
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs font-semibold">
            {notice.creator_name?.charAt(0)}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn("flex flex-col gap-0.5 max-w-[85%] sm:max-w-[75%] md:max-w-md")}>
        {!isSender && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs font-semibold text-foreground">{notice.creator_name}</span>
          </div>
        )}
        
        <div className={cn(
          "relative px-3 py-1.5 rounded-xl shadow-sm transition-all",
          isSender 
            ? "bg-primary text-primary-foreground rounded-tr-sm" 
            : "bg-secondary/80 backdrop-blur-sm rounded-tl-sm"
        )}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {notice.content}
          </p>
          {notice.attachment_url && <AttachmentPreview url={notice.attachment_url} />}
          {notice.edited_at && (
            <span className={cn("text-[10px] italic mt-1 block", isSender ? "text-primary-foreground/70" : "text-muted-foreground")}>
              edited
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] text-muted-foreground">
            {createdAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {showCategory && (
            <>
              <span className="text-[10px] text-muted-foreground">•</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
                {notice.category}
              </span>
            </>
          )}
        </div>
      </div>
      
      {isSender && !readOnly && isRecent && onEdit && onDelete && (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <MoreVertical className="h-4 w-4"/>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
  onSendMessage?: (content: string, category: string, file?: File) => Promise<void>;
  onUpdateMessage?: (id: string, content: string) => Promise<void>;
  onDeleteMessage?: (id: string) => Promise<void>;
  senderName: string;
  senderRole?: string;
  headerContent?: React.ReactNode;
  readOnly?: boolean;
}

export default function AnnouncementChat({ 
  announcements, 
  chatTitle, 
  onSendMessage, 
  onUpdateMessage, 
  onDeleteMessage, 
  senderName, 
  senderRole, 
  headerContent,
  readOnly = false
}: AnnouncementChatProps) {
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("General");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [editingMessage, setEditingMessage] = useState<Announcement | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [announcements]);

  useEffect(() => {
    cancelEdit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatTitle]);

  const handleSend = async () => {
    if (!message.trim() && !attachment) return;
    setIsSending(true);

    try {
      if(editingMessage && onUpdateMessage) {
          await onUpdateMessage(editingMessage.id, message);
          setEditingMessage(null);
      } else if(onSendMessage) {
          await onSendMessage(message, category, attachment || undefined);
      }

      setMessage("");
      setAttachment(null);
      setCategory("General");
      setShowCategoryInput(false);
      if(fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setIsSending(false);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File size cannot exceed 2MB.");
        return;
      }
      setAttachment(file);
    }
  }

  const handleEdit = (notice: Announcement) => {
    if (readOnly) return;
    setEditingMessage(notice);
    setMessage(notice.content);
    setCategory(notice.category);
    messageInputRef.current?.focus();
  }

  const cancelEdit = () => {
    setEditingMessage(null);
    setMessage("");
    setCategory("General");
    setAttachment(null);
    setShowCategoryInput(false);
    if(fileInputRef.current) fileInputRef.current.value = "";
  }
  
  const confirmDelete = async () => {
      if (deletingMessageId && onDeleteMessage) {
          await onDeleteMessage(deletingMessageId);
          setDeletingMessageId(null);
      }
  }

  if (!chatTitle) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
          <Megaphone className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Select a Group</h3>
        <p className="text-muted-foreground text-sm max-w-sm">
          Choose a class or group from the list to view announcements or send a new one.
        </p>
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-secondary/20">
      {headerContent}
      
      <div 
        ref={scrollAreaRef} 
        className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 space-y-4"
        style={{ 
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(0 0 0 / 0.05) 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }}
      >
        {announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center min-h-[300px] bg-background/50 backdrop-blur-sm">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center mb-3">
              <Info className="h-7 w-7 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Announcements Yet</h3>
            <p className="text-muted-foreground text-sm">
              Check back later for updates.
            </p>
          </div>
        ) : (
          announcements.map(notice => (
            <AnnouncementBubble 
                key={notice.id} 
                notice={notice} 
                isSender={notice.creator_name === senderName} 
                onEdit={!readOnly ? handleEdit : undefined}
                onDelete={!readOnly ? setDeletingMessageId : undefined}
                readOnly={readOnly}
                showCategory={!readOnly}
            />
          ))
        )}
      </div>
      
      {!readOnly && (
        <div className="border-t bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 p-3 sm:p-4 pb-safe shadow-lg">
          {editingMessage && (
            <div className="mb-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Edit className="h-4 w-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">Editing message</span>
                  <span className="text-xs text-blue-700 dark:text-blue-300 line-clamp-1">{editingMessage.content}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={cancelEdit} className="h-8 w-8 hover:bg-blue-100 dark:hover:bg-blue-900 flex-shrink-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {attachment && !editingMessage && (
              <div className="flex items-center gap-2 p-2 mb-2 bg-gradient-to-r from-secondary to-secondary/50 rounded-xl text-sm border animate-in slide-in-from-bottom-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {attachment.type.startsWith('image/') ? (
                      <ImageIcon className="h-4 w-4 text-primary" />
                    ) : (
                      <FileText className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-xs">{attachment.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {(attachment.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => { 
                      setAttachment(null); 
                      if(fileInputRef.current) fileInputRef.current.value = ""; 
                    }} 
                    className="flex-shrink-0 h-8 w-8 hover:bg-destructive/10"
                  >
                      <X className="h-4 w-4" />
                  </Button>
              </div>
          )}
          
          {showCategoryInput && !editingMessage && (
            <div className="mb-2 animate-in slide-in-from-bottom-2">
              <Input
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="Enter category (e.g., Homework, Event)"
                  disabled={isSending}
                  className="w-full rounded-xl border-2"
                  onBlur={() => !category && setShowCategoryInput(false)}
              />
            </div>
          )}
          
          <div className="flex items-end gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isSending || !!editingMessage}
                className="flex-shrink-0 h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
              >
                  <Paperclip className="h-5 w-5" />
              </Button>
              
              <Input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/*,application/pdf"
              />
              
              <div className="flex-1 relative">
                <Input
                    ref={messageInputRef}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder={editingMessage ? "Edit your message..." : `Message to ${chatTitle}...`}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    disabled={isSending}
                    className="pr-12 rounded-xl border-2 focus:ring-2 focus:ring-primary/20 h-10"
                />
                {!editingMessage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowCategoryInput(!showCategoryInput)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg"
                    title="Add category"
                  >
                    <span className="text-xs font-semibold text-muted-foreground">
                      {category !== 'General' ? '✓' : '#'}
                    </span>
                  </Button>
                )}
              </div>
              
              <Button 
                onClick={handleSend} 
                disabled={isSending || (!message.trim() && !attachment)}
                size="icon"
                className="flex-shrink-0 h-10 w-10 rounded-xl bg-primary shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                  {isSending ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
              </Button>
          </div>
          
          {!editingMessage && category !== 'General' && (
            <div className="mt-2 px-1">
              <span className="text-xs text-muted-foreground">
                Category: <span className="font-semibold text-foreground">{category}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
    
    <AlertDialog open={!!deletingMessageId} onOpenChange={() => setDeletingMessageId(null)}>
        <AlertDialogContent className="sm:rounded-2xl">
            <AlertDialogHeader>
                <AlertDialogTitle>Delete Announcement?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete this announcement for everyone. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={confirmDelete} 
                  className="bg-destructive hover:bg-destructive/90 rounded-xl"
                >
                  Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
