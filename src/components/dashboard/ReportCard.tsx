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

        if (authError) {
          console.error("Authentication error:", authError);
          setError("Authentication failed");
          return;
        }

        if (!user) {
          setError("No authenticated user found");
          return;
        }

        console.log("Authenticated user ID:", user.id);

        // Get student profile
        const studentProfile = await getStudentByAuthId(user.id);

        if (!studentProfile) {
          console.error("Student profile not found for auth ID:", user.id);
          setError("Student profile not found. Please contact your administrator.");
          return;
        }

        console.log("Student profile found:", { id: studentProfile.id, name: studentProfile.name });

        // Fetch exams and marks concurrently
        const [allExams, studentMarks] = await Promise.all([
          new Promise<Exam[]>((resolve, reject) => {
            try {
              const unsubscribe = getExams((examsData) => {
                console.log("Fetched exams:", examsData?.length || 0);
                resolve(examsData || []);
                // Clean up subscription
                if (unsubscribe && typeof unsubscribe.unsubscribe === 'function') {
                  unsubscribe.unsubscribe();
                }
              });
            } catch (err) {
              console.error("Error fetching exams:", err);
              reject(err);
            }
          }),
          getMarksForStudent(studentProfile.id)
        ]);
        
        console.log("Final data - Exams:", allExams?.length, "Marks groups:", Object.keys(studentMarks || {}).length);
        
        setExams(allExams || []);
        setMarks(studentMarks || {});

        // Debug: Check if we have matching exam IDs
        if (allExams && studentMarks) {
          const examIds = allExams.map(e => e.id);
          const marksExamIds = Object.keys(studentMarks);
          console.log("Exam IDs:", examIds);
          console.log("Mark exam IDs:", marksExamIds);
          console.log("Matching exams with marks:", examIds.filter(id => marksExamIds.includes(id)));
        }

      } catch (error) {
        console.error("Error fetching report card data:", error);
        setError("Failed to load report cards");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supabase.auth]);

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
              <Skeleton className="h-3 w-1/4" />
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