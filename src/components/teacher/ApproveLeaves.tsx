
"use client";

import { useState } from "react";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ThumbsDown, CalendarX2, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateLeaveStatus } from "@/lib/firebase/leaves";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";


interface ApproveLeavesProps {
  leaves: LeaveRequest[];
  title: string;
}

const rejectionSchema = z.object({
  reason: z.string().min(10, "A reason for rejection is required (min. 10 characters)."),
});

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

const NoLeavesMessage = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
    <CalendarX2 className="h-12 w-12 text-muted-foreground" />
    <h3 className="mt-4 text-lg font-semibold">No Leave Requests</h3>
    <p className="text-muted-foreground mt-2">{message}</p>
  </div>
);

const LeaveCard = ({ leave, onApprove, onReject }: { leave: LeaveRequest, onApprove: (id: string) => void, onReject: (leave: LeaveRequest) => void}) => (
    <Card>
        <CardHeader>
        <div className="flex items-start justify-between">
            <div>
            <CardTitle>{leave.userName}</CardTitle>
            <CardDescription>
                {leave.userRole === "Student" ? `Class ${leave.class}` : `Teacher`}
            </CardDescription>
            </div>
            <Badge variant={getStatusVariant(leave.status)}>{leave.status}</Badge>
        </div>
        </CardHeader>
        <CardContent>
        <p className="font-semibold text-sm">{leave.date}</p>
        <p className="text-muted-foreground mt-2">{leave.reason}</p>
         {leave.status === 'Rejected' && leave.rejectionReason && (
            <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Rejection Reason</AlertTitle>
                <AlertDescription>{leave.rejectionReason}</AlertDescription>
            </Alert>
        )}
        </CardContent>
        {leave.status === 'Pending' && (
            <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => onReject(leave)}>
                <ThumbsDown className="mr-2" /> Reject
                </Button>
                <Button size="sm" onClick={() => onApprove(leave.id)}>
                <ThumbsUp className="mr-2" /> Approve
                </Button>
            </CardFooter>
        )}
    </Card>
);

export default function ApproveLeaves({ leaves, title }: ApproveLeavesProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);

  const form = useForm<z.infer<typeof rejectionSchema>>({
    resolver: zodResolver(rejectionSchema),
    defaultValues: { reason: "" },
  });

  const { formState: { isSubmitting } } = form;

  const handleApprove = async (leaveId: string) => {
    try {
      await updateLeaveStatus(leaveId, "Confirmed");
      toast({
        title: "Leave Approved",
        description: "The leave request has been marked as confirmed.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not approve the leave status.",
      });
    }
  };
  
  const handleOpenRejectDialog = (leave: LeaveRequest) => {
      setSelectedLeave(leave);
      setIsDialogOpen(true);
      form.reset();
  }

  const handleRejectSubmit = async (values: z.infer<typeof rejectionSchema>) => {
    if (!selectedLeave) return;
    try {
        await updateLeaveStatus(selectedLeave.id, "Rejected", values.reason);
        toast({
            title: "Leave Rejected",
            description: "The leave request has been updated.",
        });
        setIsDialogOpen(false);
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: "Could not reject the leave status.",
        });
    }
  }

  const pendingLeaves = leaves.filter((leave) => leave.status === "Pending");
  const approvedLeaves = leaves.filter((leave) => leave.status === "Confirmed");
  const rejectedLeaves = leaves.filter((leave) => leave.status === "Rejected");

  if (leaves.length === 0) {
    return <NoLeavesMessage message={`${title} haven't requested any leave yet.`} />;
  }

  return (
    <>
    <Tabs defaultValue="pending">
        <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">Pending ({pendingLeaves.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approvedLeaves.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejectedLeaves.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="space-y-4 mt-4">
            {pendingLeaves.length > 0 ? (
                pendingLeaves.map(leave => <LeaveCard key={leave.id} leave={leave} onApprove={handleApprove} onReject={handleOpenRejectDialog} />)
            ) : (
                <p className="text-center text-muted-foreground p-8">No pending leave requests.</p>
            )}
        </TabsContent>
        <TabsContent value="approved" className="space-y-4 mt-4">
             {approvedLeaves.length > 0 ? (
                approvedLeaves.map(leave => <LeaveCard key={leave.id} leave={leave} onApprove={handleApprove} onReject={handleOpenRejectDialog} />)
            ) : (
                <p className="text-center text-muted-foreground p-8">No approved leaves yet.</p>
            )}
        </TabsContent>
        <TabsContent value="rejected" className="space-y-4 mt-4">
             {rejectedLeaves.length > 0 ? (
                rejectedLeaves.map(leave => <LeaveCard key={leave.id} leave={leave} onApprove={handleApprove} onReject={handleOpenRejectDialog} />)
            ) : (
                <p className="text-center text-muted-foreground p-8">No rejected leaves yet.</p>
            )}
        </TabsContent>
    </Tabs>

    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Reason for Rejection</DialogTitle>
                <DialogDescription>
                    Please provide a reason for rejecting the leave request for {selectedLeave?.userName}. This will be shared with them.
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleRejectSubmit)} className="space-y-4">
                     <FormField
                        control={form.control}
                        name="reason"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Rejection Reason</FormLabel>
                            <FormControl>
                            <Textarea
                                placeholder="e.g., Due to upcoming examinations..."
                                {...field}
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                        <Button type="submit" variant="destructive" disabled={isSubmitting}>
                             {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Rejection
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
    </>
  );
}
