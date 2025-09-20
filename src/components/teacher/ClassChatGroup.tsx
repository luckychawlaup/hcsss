
"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';

interface ClassChatGroupProps {
  assignedClasses: string[];
  onSelectClass: (classSection: string) => void;
  selectedClass: string | null;
  isLoading: boolean;
}

export default function ClassChatGroup({ assignedClasses, onSelectClass, selectedClass, isLoading }: ClassChatGroupProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }
  
  if (assignedClasses.length === 0) {
      return (
          <div className="p-4 text-center text-sm text-muted-foreground">
              No classes assigned.
          </div>
      )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        <p className="px-2 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Class Groups</p>
        {assignedClasses.map(classSection => (
          <Button
            key={classSection}
            variant={selectedClass === classSection ? "secondary" : "ghost"}
            className="w-full justify-start gap-2"
            onClick={() => onSelectClass(classSection)}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <Users className="h-4 w-4" />
            </div>
            <div className="flex flex-col items-start">
                <span className="font-semibold">{classSection}</span>
            </div>
          </Button>
        ))}
      </div>
    </ScrollArea>
  );
}
