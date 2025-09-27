
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
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
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getStudentByAuthId, Student } from "@/lib/supabase/students";
import { addLeaveRequest, getLeaveRequestsForUser, LeaveRequest } from "@/lib/supabase/leaves";
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


export default function LeavePageContent() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [pastLeaves, setPastLeaves] = useState<LeaveRequest[]>([]);
  const supabase = createClient();


  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        const user = session?.user;
        if(user) {
            setCurrentUser(user);
            const studentProfile = await getStudentByAuthId(user.id);
            setCurrentStudent(studentProfile);
            if (studentProfile) {
               const unsubscribeLeaves = getLeaveRequestsForUser(studentProfile.auth_uid, (leaves) => {
                   setPastLeaves(leaves);
               });
               // This will be cleaned up on component unmount if needed, or when user changes
            }
        } else {
            setCurrentUser(null);
            setCurrentStudent(null);
        }
    });

    return () => {
        authListener.subscription.unsubscribe();
    };
  }, [supabase]);


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
    if(!currentUser || !currentStudent) {
        toast({ variant: 'destructive', title: "Error", description: "You must be logged in to apply for leave."});
        return;
    }
    
    setIsSubmitting(true);
    try {
        const newLeave: Omit<LeaveRequest, 'id' | 'user_id'> = {
            userName: currentStudent.name,
            class: `${currentStudent.class}-${currentStudent.section}`,
            userRole: "Student",
            startDate: values.startDate,
            endDate: values.endDate || values.startDate,
            reason: values.reason,
            status: "Pending",
            appliedAt: new Date().toISOString(),
        }
        
        const documentFile = values.document?.[0];
        await addLeaveRequest(currentUser.id, newLeave, documentFile);

        toast({
            title: "Leave Application Submitted",
            description: "Your leave request has been sent for approval.",
        });
        reset({
            startDate: "",
            endDate: "",
            reason: "",
            document: undefined
        });
        const fileInput = document.getElementById('leave-document') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
    } catch(error) {
         toast({ variant: 'destructive', title: "Submission Failed", description: "Could not submit your leave request. Please try again."});
    } finally {
        setIsSubmitting(false);
    }
  }


  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
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
                          <Input placeholder="DD/MM/YYYY" {...field} />
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
                          <Input placeholder="DD/MM/YYYY" {...field} />
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
                       <Input id="leave-document" type="file" {...form.register('document')} />
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
          {pastLeaves.length > 0 ? (
            pastLeaves.map((leave) => (
              <div
                key={leave.id}
                className="flex flex-col gap-2 rounded-lg border p-4"
              >
                <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-1">
                        <p className="font-semibold text-sm">{formatLeaveDate(leave.startDate, leave.endDate)}</p>
                        <p className="text-muted-foreground text-sm">{leave.reason}</p>
                    </div>
                    <Badge variant={getStatusVariant(leave.status)}>{leave.status}</Badge>
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
            <p className="text-muted-foreground text-center py-4">
              You haven't applied for any leaves yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
