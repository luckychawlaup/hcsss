
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
    let isMounted = true;
    
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (!isMounted) return;
        if (authError || !user) {
          console.error("Authentication error:", authError);
          setError("You must be logged in to view report cards.");
          setIsLoading(false);
          return;
        }

        const studentProfile = await getStudentByAuthId(user.id);
        if (!isMounted) return;
        if (!studentProfile) {
          setError("Student profile not found. Please contact administration.");
          setIsLoading(false);
          return;
        }
        
        let examsUnsubscribe: any;
        const examsPromise = new Promise<Exam[]>((resolve, reject) => {
            examsUnsubscribe = getExams((examsData) => {
                if (isMounted) {
                  setExams(examsData || []);
                  resolve(examsData || []);
                }
            });
        });

        const [allExams, studentMarks] = await Promise.all([
            examsPromise,
            getMarksForStudent(studentProfile.id)
        ]);

        if (isMounted) {
            setMarks(studentMarks || {});
            setIsLoading(false);
        }
        
        return () => {
            if(examsUnsubscribe && typeof examsUnsubscribe.unsubscribe === 'function') {
                examsUnsubscribe.unsubscribe();
            }
        };

      } catch (error) {
        if (isMounted) {
          console.error("Error fetching report card data:", error);
          setError("Failed to load report cards.");
          setIsLoading(false);
        }
      }
    };

    fetchData();
    
    return () => {
        isMounted = false;
    }
  }, [supabase]);

  // Filter exams that have marks available
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
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
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
          <div className="text-center p-4">
            <div className="text-red-500 mb-3">
              <p className="font-medium">Error loading report cards</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              Try Again
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
            const subjectCount = examMarks.length;
            
            return (
              <div
                key={exam.id}
                className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-semibold">{exam.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(exam.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {subjectCount} subject{subjectCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <Button variant="outline" size="icon" asChild>
                  <Link href={`/report-card/${exam.id}`}>
                    <Download className="h-4 w-4" />
                    <span className="sr-only">View Report for {exam.name}</span>
                  </Link>
                </Button>
              </div>
            );
          })
        ) : (
          <div className="text-center text-muted-foreground p-8">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No report cards available</p>
            <p className="text-sm">
              Report cards will appear here once your exam results are published.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
