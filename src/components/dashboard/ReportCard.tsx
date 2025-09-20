
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
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "@/lib/firebase";
import { getExams, Exam } from "@/lib/firebase/exams";
import { getMarksForStudent, Mark } from "@/lib/firebase/marks";
import { Skeleton } from "../ui/skeleton";
import { Timestamp } from "firebase/firestore";

export default function ReportCardComponent() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [marks, setMarks] = useState<Record<string, Mark[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const unsubscribeExams = getExams(setExams);
        const unsubscribeMarks = getMarksForStudent(user.uid, (studentMarks) => {
          setMarks(studentMarks);
          setIsLoading(false);
        });
        
        return () => {
          unsubscribeExams();
          unsubscribeMarks();
        };
      } else {
        setIsLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, [auth]);

  const availableReportCards = exams.filter(exam => marks[exam.id] && marks[exam.id].length > 0);

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
                <p className="text-sm text-muted-foreground">{exam.date.toDate().toLocaleDateString()}</p>
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
