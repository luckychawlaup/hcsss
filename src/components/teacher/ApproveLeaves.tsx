
"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import type { Student } from "@/lib/firebase/students";
import type { Teacher } from "@/lib/firebase/teachers";
import {
  getLeaveRequestsForStudents,
  getLeaveRequestsForTeachers,
  updateLeaveStatus,
  LeaveRequest,
} from "@/lib/firebase/leaves";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface ApproveLeavesProps {
  assignedStudents?: Student[];
  allStudents?: Student[];
  allTeachers?: Teacher[];
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

const LeaveCard = ({
  leave,
  onUpdateStatus,
}: {
  leave: LeaveRequest;
  onUpdateStatus: (
    leaveId: string,
    status: "Confirmed" | "Rejected"
  ) => void;
}) => (
  <Card>
    <CardHeader>
      <div className="flex items-start justify-between">
        <div>
          <CardTitle>{leave.userName}</CardTitle>
          <CardDescription>
            {leave.userRole === "Student"
              ? `Class ${leave.class}`
              : `Teacher`}
          </CardDescription>
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
    {leave.status === "Pending" && (
      <CardFooter className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUpdateStatus(leave.id, "Rejected")}
        >
          <ThumbsDown className="mr-2" /> Reject
        </Button>
        <Button
          size="sm"
          onClick={() => onUpdateStatus(leave.id, "Confirmed")}
        >
          <ThumbsUp className="mr-2" /> Approve
        </Button>
      </CardFooter>
    )}
  </Card>
);

const NoLeavesMessage = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
        <CalendarX2 className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No Leave Requests</h3>
        <p className="text-muted-foreground mt-2">{message}</p>
  </div>
)

export default function ApproveLeaves({
  assignedStudents = [],
  allStudents = [],
  allTeachers = [],
  isPrincipalView = false,
}: ApproveLeavesProps) {
  const [studentLeaves, setStudentLeaves] = useState<LeaveRequest[]>([]);
  const [teacherLeaves, setTeacherLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    let unsubStudents: (() => void) | undefined;
    let unsubTeachers: (() => void) | undefined;

    if (isPrincipalView) {
      if (allStudents.length > 0) {
        const allStudentIds = allStudents.map((s) => s.id);
        unsubStudents = getLeaveRequestsForStudents(
          allStudentIds,
          (leaves) => {
            setStudentLeaves(leaves);
            setIsLoading(false);
          }
        );
      } else {
        setStudentLeaves([]);
        setIsLoading(false);
      }
      
      if (allTeachers.length > 0) {
         const allTeacherIds = allTeachers.map((t) => t.id);
         unsubTeachers = getLeaveRequestsForTeachers(allTeacherIds, (leaves) => {
            setTeacherLeaves(leaves);
         });
      } else {
        setTeacherLeaves([]);
      }

    } else { // Teacher's view
      if (assignedStudents.length > 0) {
        const studentIds = assignedStudents.map((s) => s.id);
        unsubStudents = getLeaveRequestsForStudents(
          studentIds,
          (leaves) => {
            setStudentLeaves(leaves);
            setIsLoading(false);
          }
        );
      } else {
        setIsLoading(false);
        setStudentLeaves([]);
      }
    }

    return () => {
      if (unsubStudents) unsubStudents();
      if (unsubTeachers) unsubTeachers();
    };
  }, [assignedStudents, allStudents, allTeachers, isPrincipalView]);

  const handleUpdateStatus = async (
    leaveId: string,
    status: "Confirmed" | "Rejected"
  ) => {
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
  
  const pendingStudentLeaves = studentLeaves.filter(leave => leave.status === 'Pending');
  const pendingTeacherLeaves = teacherLeaves.filter(leave => leave.status === 'Pending');

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!isPrincipalView) {
      if(studentLeaves.length === 0) {
          return <NoLeavesMessage message="Your students haven't requested any leave yet." />
      }
      if(pendingStudentLeaves.length === 0) {
           return <NoLeavesMessage message="All Clear! There are no pending leave requests to review." />
      }
    return (
      <div className="space-y-4">
        {pendingStudentLeaves.map((leave) => (
          <LeaveCard
            key={leave.id}
            leave={leave}
            onUpdateStatus={handleUpdateStatus}
          />
        ))}
      </div>
    );
  }

  // Principal's View
  return (
    <Tabs defaultValue="students">
        <TabsList>
            <TabsTrigger value="students">Student Leaves ({pendingStudentLeaves.length})</TabsTrigger>
            <TabsTrigger value="teachers">Teacher Leaves ({pendingTeacherLeaves.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="students" className="mt-4">
             {studentLeaves.length === 0 ? <NoLeavesMessage message="No student has requested leave yet."/> 
             : pendingStudentLeaves.length === 0 ? <NoLeavesMessage message="All pending student leaves have been reviewed."/> 
             : (
                 <div className="space-y-4">
                    {pendingStudentLeaves.map((leave) => (
                        <LeaveCard
                            key={leave.id}
                            leave={leave}
                            onUpdateStatus={handleUpdateStatus}
                        />
                    ))}
                </div>
             )}
        </TabsContent>
        <TabsContent value="teachers" className="mt-4">
              {teacherLeaves.length === 0 ? <NoLeavesMessage message="No teacher has requested leave yet."/> 
             : pendingTeacherLeaves.length === 0 ? <NoLeavesMessage message="All pending teacher leaves have been reviewed."/> 
             : (
                 <div className="space-y-4">
                    {pendingTeacherLeaves.map((leave) => (
                        <LeaveCard
                            key={leave.id}
                            leave={leave}
                            onUpdateStatus={handleUpdateStatus}
                        />
                    ))}
                </div>
             )}
        </TabsContent>
    </Tabs>
  );
}
