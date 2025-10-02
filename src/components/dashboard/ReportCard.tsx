
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
import { FileText, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getExams, Exam } from "@/lib/supabase/exams";
import { getMarksForStudent, Mark } from "@/lib/supabase/marks";
import { Skeleton } from "../ui/skeleton";
import { getStudentByAuthId } from "@/lib/supabase/students";
import { ScrollArea } from "../ui/scroll-area";

export default function ReportCardComponent() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [marks, setMarks] = useState<Record<string, Mark[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    let examsUnsubscribe: any;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error("You must be logged in to view report cards.");
        }

        const studentProfile = await getStudentByAuthId(user.id);
        if (!studentProfile) {
          throw new Error("Student profile not found. Please contact administration.");
        }

        const [studentMarks] = await Promise.all([
           getMarksForStudent(studentProfile.id),
        ]);

        setMarks(studentMarks || {});
        
        // Setup real-time subscription for exams
        examsUnsubscribe = getExams((examsData) => {
            setExams(examsData || []);
        });

      } catch (err: any) {
        console.error("Error fetching report card data:", err);
        setError(err.message || "Failed to load report cards.");
      } finally {
        // This ensures loading is always stopped
        setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      // Cleanup subscription on component unmount
      if (examsUnsubscribe && typeof examsUnsubscribe.unsubscribe === 'function') {
        examsUnsubscribe.unsubscribe();
      }
    };
  }, [supabase]);

  const availableReportCards = exams
    .filter((exam) => {
      const examMarks = marks[exam.id];
      return examMarks && Array.isArray(examMarks) && examMarks.length > 0 && examMarks.some(m => m.marks > 0);
    })
    .sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-primary">
            <FileText className="h-6 w-6" />
            Report Cards
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-primary">
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
  
  if (availableReportCards.length === 0) {
    return null;
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-primary">
          <FileText className="h-6 w-6" />
          Report Cards
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <ScrollArea className="h-48">
          <div className="space-y-3 pr-4">
            {availableReportCards.map((exam) => (
              <Link href={`/report-card/${exam.id}`} key={exam.id} className="block group">
              <div
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-semibold group-hover:text-primary transition-colors">{exam.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Published on {new Date(exam.date).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
              </div>
              </Link>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
