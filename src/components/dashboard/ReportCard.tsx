
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getExams, Exam } from "@/lib/supabase/exams";
import { getMarksForStudent, Mark } from "@/lib/supabase/marks";
import { getStudentByAuthId } from "@/lib/supabase/students";
import { Skeleton } from "../ui/skeleton";

export default function ReportCardComponent() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [marks, setMarks] = useState<Record<string, Mark[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        const user = session?.user;
        if (user) {
             const studentProfile = await getStudentByAuthId(user.id);
            if (studentProfile) {
                const examsUnsub = getExams((allExams) => {
                    setExams(allExams);
                });
                const marksUnsub = getMarksForStudent(studentProfile.auth_uid, (studentMarks) => {
                    setMarks(studentMarks);
                    setIsLoading(false);
                });
                
                return () => {
                    if (examsUnsub) examsUnsub.unsubscribe();
                    if (marksUnsub) marksUnsub.unsubscribe();
                }
            } else {
                 setIsLoading(false);
            }
        } else {
            setIsLoading(false);
        }
    });

    return () => {
        authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const availableReportCards = exams.filter(exam => marks[exam.id] && marks[exam.id].length > 0)
                                    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (isLoading) {
      return (
          <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <FileText className="h-6 w-6" />
                    Report Cards
                  </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </CardContent>
          </Card>
      )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <FileText className="h-6 w-6" />
          Report Cards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {availableReportCards.length > 0 ? (
          availableReportCards.map((exam) => (
            <div
              key={exam.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div>
                <p className="font-semibold">{exam.name}</p>
                <p className="text-sm text-muted-foreground">{new Date(exam.date).toLocaleDateString()}</p>
              </div>
              <Button variant="outline" size="icon" asChild>
                <Link href={`/report-card/${exam.id}`}>
                  <Download className="h-4 w-4" />
                  <span className="sr-only">View Report</span>
                </Link>
              </Button>
            </div>
          ))
        ) : (
          <div className="text-center text-muted-foreground p-4">
            No report cards available yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
