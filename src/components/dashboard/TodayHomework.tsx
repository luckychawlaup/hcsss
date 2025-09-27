
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

function formatDueDate(dateString: string) {
    try {
        return format(new Date(dateString), "dd/MM/yyyy");
    } catch (e) {
        return "-";
    }
}

export default function TodayHomework() {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let channel: any;
    const fetchHomework = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const studentProfile = await getStudentByAuthId(user.id);
            if (studentProfile) {
                const classSection = `${studentProfile.class}-${studentProfile.section}`;
                channel = getHomeworks(classSection, (newHomeworks) => {
                    setHomeworks(newHomeworks);
                    setIsLoading(false);
                }, { dateFilter: 'today' });
            } else {
                setIsLoading(false);
            }
        } else {
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
                        <TableHead>Due</TableHead>
                        <TableHead className="text-right">File</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {homeworks.map((hw) => (
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
