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

export default function ReportCardComponent() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [marks, setMarks] = useState<Record<string, Mark[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
          console.error("Auth error:", authError);
          setError("Authentication error");
          return;
        }

        if (!user) {
          console.log("No authenticated user found");
          setExams([]);
          setMarks({});
          return;
        }

        console.log("Fetching data for user:", user.id);

        // Fetch exams and marks concurrently
        const [allExams, studentMarks] = await Promise.all([
          // Fixed: Properly handle the getExams function
          new Promise<Exam[]>((resolve, reject) => {
            try {
              const result = getExams((exams) => {
                console.log("Received exams:", exams);
                resolve(exams || []);
              });
              
              // Handle case where getExams might return a promise or subscription
              if (result && typeof result.then === 'function') {
                result.then(resolve).catch(reject);
              }
            } catch (err) {
              console.error("Error in getExams:", err);
              reject(err);
            }
          }),
          // Fixed: Properly handle the getMarksForStudent function
          (async () => {
            try {
              const studentMarks = await getMarksForStudent(user.id);
              console.log("Received marks:", studentMarks);
              return studentMarks;
            } catch (err) {
              console.error("Error fetching marks:", err);
              return {};
            }
          })()
        ]);
        
        console.log("All exams:", allExams);
        console.log("Student marks:", studentMarks);
        
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
  }, []);

  // Filter exams that have marks for the student
  const availableReportCards = exams
    .filter((exam) => {
      const examMarks = marks[exam.id];
      const hasMarks = examMarks && Array.isArray(examMarks) && examMarks.length > 0;
      console.log(`Exam ${exam.name} (${exam.id}) has marks:`, hasMarks, examMarks);
      return hasMarks;
    })
    .sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

  console.log("Available report cards:", availableReportCards);

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
            {exams.length > 0 && (
              <p className="text-xs mt-2">
                Found {exams.length} exam{exams.length !== 1 ? 's' : ''} but no marks recorded.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}