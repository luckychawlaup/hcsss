
"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import type { Student, LeaveRequest } from "@/lib/firebase/students";
import { getLeaveRequestsForStudents, updateLeaveStatus } from "@/lib/firebase/students";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "../ui/skeleton";
import { ThumbsUp, ThumbsDown, CalendarX2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ApproveLeavesProps {
  students: Student[];
  isPrincipalView?: boolean;
}

const getStatusVariant = (status: LeaveRequest["status"]) => {
  switch (status) {
    case "Confirmed":
      return "default";
    case "Pending":
      return "secondary";
    case "Rejected":
      return "destructive";
  }
};

export default function ApproveLeaves({ students, isPrincipalView = false }: ApproveLeavesProps) {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    if (students.length > 0) {
      const studentIds = students.map((s) => s.id);
      const unsubscribe = getLeaveRequestsForStudents(studentIds, (fetchedLeaves) => {
        setLeaves(fetchedLeaves);
        setIsLoading(false);
      });
      return () => unsubscribe();
    } else {
        setIsLoading(false);
        setLeaves([]);
    }
  }, [students]);

  const handleUpdateStatus = async (leaveId: string, status: "Confirmed" | "Rejected") => {
    try {
      await updateLeaveStatus(leaveId, status);
      toast({
        title: `Leave ${status}`,
        description: "The leave request has been updated.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update the leave status.",
      });
    }
  };

  const pendingLeaves = leaves.filter(leave => leave.status === "Pending");

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }
  
  if (leaves.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
            <CalendarX2 className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Leave Requests</h3>
            <p className="text-muted-foreground mt-2">{isPrincipalView ? "There are no leave requests from any student yet." : "Your students haven't requested any leave yet."}</p>
      </div>
      )
  }

  if (pendingLeaves.length === 0) {
     return (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
            <CalendarX2 className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">All Clear!</h3>
            <p className="text-muted-foreground mt-2">There are no pending leave requests to review.</p>
      </div>
      )
  }

  return (
    <div className="space-y-4">
      {pendingLeaves.map((leave) => (
        <Card key={leave.id}>
          <CardHeader>
             <div className="flex items-start justify-between">
                <div>
                     <CardTitle>{leave.studentName}</CardTitle>
                    <CardDescription>Class {leave.class}</CardDescription>
                </div>
                <Badge variant={getStatusVariant(leave.status)}>{leave.status}</Badge>
            </div>
          </CardHeader>
          <CardContent>
             <p className="font-semibold text-sm">
                {format(new Date(leave.dateFrom), "MMM dd, yyyy")}
                {leave.dateTo && ` - ${format(new Date(leave.dateTo), "MMM dd, yyyy")}`}
            </p>
            <p className="text-muted-foreground mt-2">{leave.reason}</p>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUpdateStatus(leave.id, "Rejected")}
            >
              <ThumbsDown className="mr-2" /> Reject
            </Button>
            <Button size="sm" onClick={() => handleUpdateStatus(leave.id, "Confirmed")}>
              <ThumbsUp className="mr-2" /> Approve
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
