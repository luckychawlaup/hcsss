
"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Book, Download, Info, FileText, ChevronRight } from "lucide-react";
import { getHomeworks, Homework } from "@/lib/supabase/homework";
import { getStudentByAuthId } from "@/lib/supabase/students";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import Link from "next/link";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";

function HomeworkSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export default function TodayHomework() {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  
  useEffect(() => {
    let channel: any;

    const fetchHomework = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsLoading(false);
          return;
        }
        
        const studentProfile = await getStudentByAuthId(user.id);
        
        if (!studentProfile) {
          setError('Student profile not found');
          setIsLoading(false);
          return;
        }
        
        const classSection = `${studentProfile.class}-${studentProfile.section}`;
        
        channel = getHomeworks(classSection, (newHomeworks) => {
          setHomeworks(newHomeworks);
          setIsLoading(false);
        }, { dateFilter: 'today' });
        
      } catch (err) {
        console.error('TodayHomework: Error in fetchHomework:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      }
    };

    fetchHomework();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase]);

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-center">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Book className="h-6 w-6" />
            Today's Homework
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-6 bg-destructive/10 rounded-md h-full">
            <Info className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm font-semibold text-destructive">Error: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-center">
        <CardTitle className="flex items-center gap-2 text-primary">
          <Book className="h-6 w-6" />
          Today's Homework
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {isLoading ? (
          <HomeworkSkeleton />
        ) : homeworks.length > 0 ? (
          <div className="flex-1 space-y-4">
              {homeworks.slice(0,3).map((hw) => (
                <div key={hw.id} className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-secondary/50">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">{hw.subject}</p>
                          {hw.attachment_url && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                              <a href={hw.attachment_url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{hw.description}</p>
                        <p className="text-xs text-muted-foreground mt-2">Due: {format(new Date(hw.due_date), "do MMMM")}</p>
                    </div>
                </div>
              ))}
                {homeworks.length > 3 && (
                    <div className="text-center">
                        <Button variant="link" asChild>
                            <Link href="/homework">
                                And {homeworks.length - 3} more...
                            </Link>
                        </Button>
                    </div>
                )}
          </div>
        ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center p-6 bg-secondary/30 rounded-md h-full">
                <Info className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-semibold text-muted-foreground">No homework assigned for today!</p>
            </div>
        )}
      </CardContent>
       <div className="p-6 pt-0 mt-auto">
            <Button asChild className="w-full">
                <Link href="/homework">
                    View All Homework <ChevronRight className="ml-2 h-4 w-4"/>
                </Link>
            </Button>
        </div>
    </Card>
  );
}
