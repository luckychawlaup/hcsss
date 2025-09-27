
"use client";

import { useState, useEffect } from "react";
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
import { Book, Download, Info } from "lucide-react";
import { getHomeworks, Homework } from "@/lib/supabase/homework";
import { getStudentByAuthId } from "@/lib/supabase/students";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import Link from "next/link";

function HomeworkSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
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
      try {
        console.log('TodayHomework: Starting to fetch user data...');
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('TodayHomework: Auth error:', authError);
          setError('Authentication error');
          setIsLoading(false);
          return;
        }
        
        if (!user) {
          console.log('TodayHomework: No user found');
          setIsLoading(false);
          return;
        }
        
        console.log('TodayHomework: User found, getting student profile...');
        const studentProfile = await getStudentByAuthId(user.id);
        
        if (!studentProfile) {
          console.error('TodayHomework: No student profile found for user:', user.id);
          setError('Student profile not found');
          setIsLoading(false);
          return;
        }
        
        console.log('TodayHomework: Student profile found:', studentProfile);
        const classSection = `${studentProfile.class}-${studentProfile.section}`;
        console.log('TodayHomework: Using class section:', classSection);
        
        // Set up homework subscription
        channel = getHomeworks(classSection, (newHomeworks) => {
          console.log('TodayHomework: Received homework data:', newHomeworks);
          setHomeworks(newHomeworks);
          setIsLoading(false);
          setError(null);
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
        console.log('TodayHomework: Cleaning up channel...');
        supabase.removeChannel(channel);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Book className="h-6 w-6" />
            Today's Homework
          </CardTitle>
          <Button variant="link" size="sm" asChild>
            <Link href="/homework">View All</Link>
          </Button>
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
          <Book className="h-6 w-6" />
          Today's Homework
        </CardTitle>
        <Button variant="link" size="sm" asChild>
            <Link href="/homework">View All</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <HomeworkSkeleton />
        ) : (
          <div className="overflow-x-auto">
            {homeworks.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Assignment</TableHead>
                        <TableHead className="text-right">File</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {homeworks.map((hw) => (
                            <TableRow key={hw.id}>
                                <TableCell className="font-medium">{hw.subject}</TableCell>
                                <TableCell>{hw.description}</TableCell>
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
            ) : (
                <div className="flex flex-col items-center justify-center text-center p-6 bg-secondary/30 rounded-md">
                    <Info className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-semibold text-muted-foreground">No homework assigned for today!</p>
                </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
