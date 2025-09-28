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
import { Skeleton } from "../ui/skeleton";
import { getStudentByAuthId } from "@/lib/supabase/students";


export default function ReportCardComponent() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [marks, setMarks] = useState<Record<string, Mark[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          setError("Authentication error");
          setIsLoading(false);
          return;
        }

        const studentProfile = await getStudentByAuthId(user.id);

        if (!studentProfile) {
          setError("Student profile not found");
          setIsLoading(false);
          return;
        }

        // Fetch exams and marks concurrently
        const [allExams, studentMarks] = await Promise.all([
          new Promise<Exam[]>((resolve, reject) => {
            try {
              const unsubscribe = getExams((exams) => {
                resolve(exams || []);
                if (unsubscribe) unsubscribe.unsubscribe(); // Clean up subscription after first fetch
              });
            } catch (err) {
              reject(err);
            }
          }),
          getMarksForStudent(studentProfile.id) // Use student's primary key `id`
        ]);
        
        setExams(allExams || []);
        setMarks(studentMarks || {});

      } catch (error) {
        console.error("Error fetching report cards:", error);
        setError("Failed to fetch report cards");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const availableReportCards = exams
    .filter((exam) => {
      const examMarks = marks[exam.id];
      return examMarks && Array.isArray(examMarks) && examMarks.length > 0;
    })
    .sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );


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
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <FileText className="h-6 w-6" />
            Report Cards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500 p-4">
            Error: {error}
            <Button 
              variant="outline" 
              className="ml-2"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
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
          availableReportCards.map((exam) => {
            const examMarks = marks[exam.id] || [];
            return (
              <div
                key={exam.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <p className="font-semibold">{exam.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(exam.date).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {examMarks.length} subject{examMarks.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <Button variant="outline" size="icon" asChild>
                  <Link href={`/report-card/${exam.id}`}>
                    <Download className="h-4 w-4" />
                    <span className="sr-only">View Report</span>
                  </Link>
                </Button>
              </div>
            );
          })
        ) : (
          <div className="text-center text-muted-foreground p-4">
            <p>No report cards available yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
