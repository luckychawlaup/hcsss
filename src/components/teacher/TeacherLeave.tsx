
"use client";

import { useState, useEffect } from "react";
import type { Teacher } from "@/lib/supabase/teachers";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Send,
  History,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  addLeaveRequest,
  getLeaveRequestsForUser,
  LeaveRequest,
} from "@/lib/supabase/leaves";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

const leaveSchema = z.object({
    startDate: z.string().min(1, "Start date is required."),
    endDate: z.string().optional(),
    reason: z.string().min(10, "Reason must be at least 10 characters long."),
    document: z.any().optional(),
});

const getStatusVariant = (status: LeaveRequest["status"]) => {
  switch (status) {
    case "Confirmed":
      return "default";
    case "Pending":
      return "secondary";
    case "Rejected":
      return "destructive";
    default:
      return "secondary";
  }
};

const formatLeaveDate = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start.getTime() === end.getTime()) {
        return format(start, "do MMM, yyyy");
    }
    return `${format(start, "do MMM")} - ${format(end, "do MMM, yyyy")}`;
}

interface TeacherLeaveProps {
  teacher: Teacher | null;
}

export function TeacherLeave({ teacher }: TeacherLeaveProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pastLeaves, setPastLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (teacher) {
        setIsLoading(true);
        const unsubscribe = getLeaveRequestsForUser(teacher.auth_uid, (leaves) => {
            setPastLeaves(leaves || []);
            setIsLoading(false);
        });
        
        return () => {
            if (unsubscribe && typeof unsubscribe.unsubscribe === 'function') {
                unsubscribe.unsubscribe();
            }
        };
    } else {
        setIsLoading(false);
    }
  }, [teacher]);

  const form = useForm<z.infer<typeof leaveSchema>>({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      startDate: "",
      endDate: "",
      reason: "",
    },
  });

  const { handleSubmit, reset } = form;

  async function onSubmit(values: z.infer<typeof leaveSchema>) {
    if (!teacher) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to apply for leave.",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
        const startDate = new Date(values.startDate).toISOString();
        const endDate = values.endDate 
          ? new Date(values.endDate).toISOString() 
          : startDate;

        const newLeave: Omit<LeaveRequest, "id" | "user_id"> = {
          userName: teacher.name,
          userRole: "Teacher",
          startDate,
          endDate,
          reason: values.reason.trim(),
          status: "Pending",
          appliedAt: new Date().toISOString(),
          teacherId: teacher.id,
        };
        
        await addLeaveRequest(teacher.auth_uid, newLeave);
        
        toast({
            title: "Leave Application Submitted",
            description: "Your leave request has been sent for approval.",
        });
        
        reset({
            startDate: "",
            endDate: "",
            reason: "",
            document: undefined,
        });
        
        const fileInput = document.getElementById("leave-document-teacher") as HTMLInputElement;
        if (fileInput) {
            fileInput.value = "";
        }
    } catch (error) {
        console.error("Error submitting leave request:", error);
        toast({
            variant: "destructive",
            title: "Submission Failed",
            description: error instanceof Error ? error.message : "Could not submit your leave request. Please try again.",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  if (!teacher) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Please log in to access leave management.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="border-0 shadow-none">
        <CardHeader className="p-0">
          <CardTitle>Request for Leave</CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-6">
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
               </div>

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Leave</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Explain the reason for your absence..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="document"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supporting Document (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        id="leave-document-teacher"
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        {...form.register("document")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Request
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-none">
        <CardHeader className="p-0">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Leave History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-0 mt-6">
          {isLoading ? (
            <div className="text-center py-4">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              <p className="text-muted-foreground mt-2">Loading leave history...</p>
            </div>
          ) : pastLeaves.length > 0 ? (
            pastLeaves.map((leave) => (
              <div
                key={leave.id}
                className="flex flex-col gap-2 rounded-lg border p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-sm">
                      {formatLeaveDate(leave.startDate, leave.endDate)}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {leave.reason}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Applied: {format(new Date(leave.appliedAt), "PPp")}
                    </p>
                  </div>
                  <Badge variant={getStatusVariant(leave.status)}>
                    {leave.status}
                  </Badge>
                </div>
                 {(leave.status === 'Rejected' && leave.rejectionReason) && (
                     <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Rejection Reason</AlertTitle>
                        <AlertDescription>{leave.rejectionReason}</AlertDescription>
                    </Alert>
                )}
                {(leave.status === 'Confirmed' && leave.approverComment) && (
                     <Alert variant="default" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Approver's Comment</AlertTitle>
                        <AlertDescription>{leave.approverComment}</AlertDescription>
                    </Alert>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <History className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground mt-4">
                You haven't applied for any leaves yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
