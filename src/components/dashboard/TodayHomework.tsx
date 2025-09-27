
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
import { BookOpen, Download, Book } from "lucide-react";
import { getHomeworks, Homework } from "@/lib/supabase/homework";
import { getStudentByAuthId, Student } from "@/lib/supabase/students";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

function HomeworkSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

export default function TodayHomework() {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
      const fetchHomework = async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
              const studentProfile = await getStudentByAuthId(user.id);
              if (studentProfile) {
                  const classSection = `${studentProfile.class}-${studentProfile.section}`;
                  const unsubscribeHomework = getHomeworks(classSection, (newHomeworks) => {
                      setHomeworks(newHomeworks);
                      setIsLoading(false);
                  });
                  return () => {
                      if(unsubscribeHomework && unsubscribeHomework.unsubscribe) {
                        unsubscribeHomework.unsubscribe();
                      }
                  };
              } else {
                  setIsLoading(false);
              }
          } else {
              setIsLoading(false);
          }
      };

      fetchHomework();

  }, [supabase]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-primary">
          <Book className="h-6 w-6" />
          Today's Homework
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <HomeworkSkeleton />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-0 sm:pl-6">Subject</TableHead>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right pr-0 sm:pr-6">File</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {homeworks.length > 0 ? (
                  homeworks.map((hw, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium pl-0 sm:pl-6">{hw.subject}</TableCell>
                      <TableCell>{hw.description}</TableCell>
                      <TableCell>{format(new Date(hw.due_date), "dd/MM")}</TableCell>
                      <TableCell className="text-right pr-0 sm:pr-6">
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
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No recent homework. Great job!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
