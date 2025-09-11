
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
import { BookOpen, Download } from "lucide-react";
import { getHomeworks, Homework } from "@/lib/firebase/homework";
import { getAuth, User } from "firebase/auth";
import { getStudentByAuthId, Student } from "@/lib/firebase/students";
import { app } from "@/lib/firebase";

function HomeworkSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

export default function Homework() {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const studentProfile = await getStudentByAuthId(user.uid);
        if (studentProfile) {
          const classSection = `${studentProfile.class}-${studentProfile.section}`;
          const unsubscribeHomework = getHomeworks(classSection, (newHomeworks) => {
            setHomeworks(newHomeworks);
            setIsLoading(false);
          });
          // Here you should store and call unsubscribeHomework on component unmount
        } else {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [auth]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-primary">
          <BookOpen className="h-6 w-6" />
          Today's Homework
        </CardTitle>
        <Button variant="link" size="sm">
          View All
        </Button>
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
                      <TableCell>{hw.dueDate.split("-")[2]}/{hw.dueDate.split("-")[1]}</TableCell>
                      <TableCell className="text-right pr-0 sm:pr-6">
                        {hw.attachmentUrl ? (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={hw.attachmentUrl} target="_blank" rel="noopener noreferrer">
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
                      No homework has been assigned yet.
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
