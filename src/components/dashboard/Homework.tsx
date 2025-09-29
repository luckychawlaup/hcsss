
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Download, Info } from "lucide-react";
import { getHomeworks, Homework } from "@/lib/supabase/homework";
import { getStudentByAuthId } from "@/lib/supabase/students";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

function HomeworkSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-1/3" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
       <Skeleton className="h-10 w-1/3 mt-6" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

function formatDueDate(dateString: string) {
    try {
        return format(new Date(dateString), "dd/MM/yyyy");
    } catch (e) {
        return "-";
    }
}

export default function Homework() {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchHomework = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return () => {}; // Return an empty cleanup function
      }
      
      const studentProfile = await getStudentByAuthId(user.id);
      
      if (!studentProfile) {
        setError('Student profile not found');
        setIsLoading(false);
        return () => {};
      }
      
      const classSection = `${studentProfile.class}-${studentProfile.section}`;
      
      const channel = getHomeworks(classSection, (newHomeworks) => {
        setHomeworks(newHomeworks);
        setIsLoading(false);
        setError(null);
      }, { dateFilter: 7 });

      return () => {
        if (channel) {
          supabase.removeChannel(channel);
        }
      };
      
    } catch (err) {
      console.error('Homework: Error in fetchHomework:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
      return () => {};
    }
  }, [supabase]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    fetchHomework().then(cleanupFn => {
      cleanup = cleanupFn;
    });
    
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [fetchHomework]);

  const groupedHomework = useMemo(() => {
    if (!homeworks.length) return {};
    
    return homeworks.reduce((acc, hw) => {
        try {
            const dateKey = format(new Date(hw.assigned_at), "yyyy-MM-dd");
            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push(hw);
        } catch (error) {
            console.error('Error parsing date for homework:', hw, error);
        }
        return acc;
    }, {} as Record<string, Homework[]>);
  }, [homeworks]);

  const sortedDates = Object.keys(groupedHomework).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-primary">
            <BookOpen className="h-6 w-6" />
            Homework Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-6 bg-destructive/10 rounded-md">
            <Info className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm font-semibold text-destructive">Error: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-primary">
          <BookOpen className="h-6 w-6" />
          Homework Assignments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <HomeworkSkeleton />
        ) : sortedDates.length > 0 ? (
          sortedDates.map(date => (
            <div key={date}>
                <h3 className="font-semibold text-lg text-foreground mb-2">
                    {format(new Date(date), "EEEE, do MMMM")}
                </h3>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Subject</TableHead>
                            <TableHead>Assignment</TableHead>
                            <TableHead>Due</TableHead>
                            <TableHead className="text-right">File</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {groupedHomework[date].map((hw) => (
                                <TableRow key={hw.id}>
                                    <TableCell className="font-medium">{hw.subject}</TableCell>
                                    <TableCell>{hw.description}</TableCell>
                                    <TableCell>{formatDueDate(hw.due_date)}</TableCell>
                                    <TableCell className="text-right">
                                        {hw.attachment_url ? (
                                        <Button variant="ghost" size="icon" asChild>
                                            <a href={hw.attachment_url} target="_blank" rel="noopener noreferrer">
                                            <Download className="h-4 w-4" />
                                            </a>
                                        </Button>
                                        ) : (
                                        <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
          ))
        ) : (
             <div className="text-center text-muted-foreground p-8 border border-dashed rounded-md">
                <Info className="h-8 w-8 mx-auto mb-2" />
                <p>No homework assigned in the last 7 days.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
