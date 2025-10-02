
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "../ui/skeleton";
import { Calendar, Info } from "lucide-react";
import { getExams, Exam } from "@/lib/supabase/exams";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getStudentByAuthId, Student } from "@/lib/supabase/students";
import { getScheduleForClass } from "@/lib/supabase/marks";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

export default function ExamDatesheet() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  
  const upcomingExam = exams.find(e => new Date(e.date) >= new Date());

  useEffect(() => {
    setIsLoading(true);
    let examsUnsub: any;
    
    const fetchInitialData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const studentProfile = await getStudentByAuthId(user.id);
            setStudent(studentProfile);
            
            examsUnsub = getExams(async (examData) => {
                const sortedExams = examData.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                setExams(sortedExams);

                const nextExam = sortedExams.find(e => new Date(e.date) >= new Date());
                if (nextExam && studentProfile) {
                    const classSchedule = await getScheduleForClass(nextExam.id, `${studentProfile.class}-${studentProfile.section}`);
                    if(classSchedule) {
                        setSchedule(classSchedule.sort((a,b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()));
                    }
                }
                setIsLoading(false);
            });
        } else {
             setIsLoading(false);
        }
    }

    fetchInitialData();
    
    return () => {
        if(examsUnsub && typeof examsUnsub.unsubscribe === 'function') {
            examsUnsub.unsubscribe();
        }
    }
  }, [supabase]);
  

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!upcomingExam || schedule.length === 0) {
    return null; // Don't render anything if no upcoming exams or no schedule
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Calendar/>
            Upcoming Exam: {upcomingExam.name}
        </CardTitle>
        <CardDescription>
            The datesheet for your next examination is below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Subject</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {schedule.map((item, index) => (
                    <TableRow key={index}>
                        <TableCell className="font-semibold">{item.exam_date ? format(new Date(item.exam_date), 'EEEE, do MMMM') : 'N/A'}</TableCell>
                        <TableCell>{item.subject}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
