

"use client";

import { useState } from "react";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, startOfDay } from "date-fns";
import type { LeaveRequest } from "@/lib/supabase/leaves";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardFooter,
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
import { ThumbsUp, ThumbsDown, CalendarX2, Loader2, MessageSquare, Calendar as CalendarIcon, Pencil, FileText, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateLeaveRequest } from "@/lib/supabase/leaves";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { cn } from "@/lib/utils";
import Link from "next/link";


interface ApproveLeavesProps {
  leaves: LeaveRequest[];
  title: string;
  isPrincipal?: boolean;
}

const commentSchema = z.object({
  comment: z.string().min(1, "Comment cannot be empty."),
});

const editDateSchema = z.object({
  dateRange: z.object({
    from: z.date({ required_error: "Start date is required." }),
    to: z.date().optional(),
  }),
});

const formatLeaveDate = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return "Invalid Date";
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return "Invalid Date";
    }
    if (start.getTime() === end.getTime()) {
        return format(start, "do MMM, yyyy");
    }
    return `${format(start, "do MMM")} - ${format(end, "do MMM, yyyy")}`;
}

const getStatusVariant = (status: LeaveRequest["status"]) => {
  switch (status) {
    case "Confirmed":
      return "success";
    case "Pending":
      return "secondary";
    case "Rejected":
      return "destructive";
  }
};

export default function ApproveLeaves({ leaves, title, isPrincipal = false }: ApproveLeavesProps) {
  const { toast } = useToast();
  const [dialogState, setDialogState] = useState<{
    type: 'comment' | 'reject' | 'edit_date' | null;
    leave: LeaveRequest | null;
  }>({ type: null, leave: null });

  const commentForm = useForm<z.infer<typeof commentSchema>>({
    resolver: zodResolver(commentSchema),
  });

  const dateForm = useForm<z.infer<typeof editDateSchema>>({
    resolver: zodResolver(editDateSchema),
  });

  const { formState: { isSubmitting } } = commentForm;

  const handleApprove = async (leaveId: string) => {
    try {
      await updateLeaveRequest(leaveId, { status: "Confirmed" });
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
  
  const handleOpenDialog = (type: 'comment' | 'reject' | 'edit_date', leave: LeaveRequest) => {
      setDialogState({ type, leave });
      if (type === 'comment' || type === 'reject') {
          commentForm.reset({ comment: leave.approverComment || leave.rejectionReason || "" });
      }
      if (type === 'edit_date' && leave.startDate && leave.endDate) {
          dateForm.reset({ dateRange: { from: new Date(leave.startDate), to: new Date(leave.endDate) } });
      }
  }

  const handleCommentSubmit = async (values: z.infer<typeof commentSchema>) => {
    if (!dialogState.leave) return;

    let updates: Partial<LeaveRequest> = {};
    if (dialogState.type === 'reject') {
      updates = { 
        status: 'Rejected',
        rejectionReason: values.comment 
      };
    } else {
      updates = { approverComment: values.comment };
    }
    
    try {
        await updateLeaveRequest(dialogState.leave.id, updates);
        toast({
            title: dialogState.type === 'reject' ? "Leave Rejected" : "Comment Saved",
            description: "The leave request has been updated.",
        });
        setDialogState({ type: null, leave: null });
    } catch (error) {
         toast({ variant: "destructive", title: "Update Failed", description: "Could not update the leave request."});
    }
  }

  const handleDateEditSubmit = async (values: z.infer<typeof editDateSchema>) => {
      if (!dialogState.leave) return;
      const updates = {
          startDate: values.dateRange.from.toISOString(),
          endDate: (values.dateRange.to || values.dateRange.from).toISOString(),
      };
      try {
        await updateLeaveRequest(dialogState.leave.id, updates);
        toast({ title: "Leave Dates Updated", description: "The leave duration has been modified."});
        setDialogState({ type: null, leave: null });
      } catch (error) {
          toast({ variant: "destructive", title: "Update Failed", description: "Could not update the dates."});
      }
  }

  if (leaves.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
            <CalendarX2 className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Submissions Found</h3>
            <p className="text-muted-foreground mt-2">There are no complaints or feedback in this category yet.</p>
        </div>
    );
  }

  return (
    <>
    <div className="space-y-4">
        {title === "Students" && (
             <Alert variant="default" className="bg-blue-50 border-blue-200">
                <Shield className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800 font-semibold">Student Anonymity Notice</AlertTitle>
                <AlertDescription className="text-blue-700">
                    For most categories, student identity is kept anonymous to protect their privacy. For issues requiring direct follow-up (like 'Fee-related' or 'IT Issues'), the student's name is shown.
                </AlertDescription>
            </Alert>
        )}
        {leaves.map((leave) => (
            <Card key={leave.id}>
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
                    <p className="font-semibold text-sm">{formatLeaveDate(leave.startDate, leave.endDate)}</p>
                    <p className="text-muted-foreground mt-2">{leave.reason}</p>
                     {(leave.status === 'Rejected' && leave.rejectionReason) && (
                        <Alert variant="destructive" className="mt-4">
                            <ThumbsDown className="h-4 w-4" />
                            <AlertTitle>Rejection Reason</AlertTitle>
                            <AlertDescription>{leave.rejectionReason}</AlertDescription>
                        </Alert>
                    )}
                    {leave.approverComment && (
                        <Alert className="mt-4">
                            <MessageSquare className="h-4 w-4" />
                            <AlertTitle>Approver's Comment</AlertTitle>
                            <AlertDescription>{leave.approverComment}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2 justify-end">
                    {leave.document_url && (
                        <Button asChild variant="secondary" size="sm">
                            <Link href={leave.document_url} target="_blank">
                                <FileText className="mr-2" /> View Document
                            </Link>
                        </Button>
                    )}
                    {leave.status === 'Pending' && (
                        <>
                        <Button variant="outline" size="sm" onClick={() => handleOpenDialog('reject', leave)}>
                            <ThumbsDown className="mr-2" /> Reject
                        </Button>
                        <Button size="sm" onClick={() => handleApprove(leave.id)}>
                            <ThumbsUp className="mr-2" /> Approve
                        </Button>
                        </>
                    )}
                    {isPrincipal && leave.userRole === 'Teacher' && (
                       <Button variant="outline" size="sm" onClick={() => handleOpenDialog('edit_date', leave)}>
                           <Pencil className="mr-2" /> Edit Dates
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleOpenDialog('comment', leave)}>
                        <MessageSquare className="mr-2" /> {leave.approverComment ? 'Edit Comment' : 'Add Comment'}
                    </Button>
                </CardFooter>
            </Card>
        ))}
    </div>

    {/* Comment/Rejection Dialog */}
    <Dialog open={dialogState.type === 'comment' || dialogState.type === 'reject'} onOpenChange={() => setDialogState({ type: null, leave: null })}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{dialogState.type === 'reject' ? "Reason for Rejection" : "Add/Edit Comment"}</DialogTitle>
                <DialogDescription>
                    {dialogState.type === 'reject'
                        ? `Provide a reason for rejecting the leave for ${dialogState.leave?.userName}.`
                        : `Add a comment to the leave request for ${dialogState.leave?.userName}.`}
                </DialogDescription>
            </DialogHeader>
            <Form {...commentForm}>
                <form onSubmit={commentForm.handleSubmit(handleCommentSubmit)} className="space-y-4">
                     <FormField
                        control={commentForm.control}
                        name="comment"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>{dialogState.type === 'reject' ? "Rejection Reason" : "Comment"}</FormLabel>
                            <FormControl>
                                <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setDialogState({ type: null, leave: null })} disabled={isSubmitting}>Cancel</Button>
                        <Button type="submit" variant={dialogState.type === 'reject' ? "destructive" : "default"} disabled={isSubmitting}>
                             {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                             {dialogState.type === 'reject' ? "Confirm Rejection" : "Save Comment"}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>

    {/* Edit Date Dialog */}
    <Dialog open={dialogState.type === 'edit_date'} onOpenChange={() => setDialogState({ type: null, leave: null })}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Leave Dates</DialogTitle>
                <DialogDescription>Modify the leave duration for {dialogState.leave?.userName}.</DialogDescription>
            </DialogHeader>
            <Form {...dateForm}>
                <form onSubmit={dateForm.handleSubmit(handleDateEditSubmit)} className="space-y-4">
                    <FormField
                        control={dateForm.control}
                        name="dateRange"
                        render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Leave Dates</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal",!field.value?.from && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value?.from ? (field.value.to ? (<>{format(field.value.from, "LLL dd, y")} - {format(field.value.to, "LLL dd, y")}</>) : (format(field.value.from, "LLL dd, y"))) : (<span>Pick a date or range</span>)}
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar initialFocus mode="range" defaultMonth={field.value?.from} selected={{ from: field.value?.from, to: field.value?.to }} onSelect={field.onChange} numberOfMonths={1} />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setDialogState({ type: null, leave: null })}>Cancel</Button>
                        <Button type="submit">Save Changes</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
    </>
  );
}
