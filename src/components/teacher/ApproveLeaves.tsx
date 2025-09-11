
"use client";

import { format } from "date-fns";
import type { LeaveRequest } from "@/lib/firebase/leaves";
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
import { ThumbsUp, ThumbsDown, CalendarX2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateLeaveStatus } from "@/lib/firebase/leaves";

interface ApproveLeavesProps {
  leaves: LeaveRequest[];
  title: string;
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
  leaves,
  title,
}: ApproveLeavesProps) {
  const { toast } = useToast();

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
  
  const pendingLeaves = leaves.filter(leave => leave.status === 'Pending');

  if (leaves.length === 0) {
      return <NoLeavesMessage message={`${title} haven't requested any leave yet.`} />
  }

  if (pendingLeaves.length === 0) {
        return <NoLeavesMessage message={`All Clear! There are no pending leave requests from ${title} to review.`} />
  }

  return (
    <div className="space-y-4">
    {pendingLeaves.map((leave) => (
        <LeaveCard
        key={leave.id}
        leave={leave}
        onUpdateStatus={handleUpdateStatus}
        />
    ))}
    </div>
  );
}
