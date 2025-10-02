

"use client";

import { useState, useEffect } from "react";
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
  CalendarIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getStudentByAuthId, Student } from "@/lib/supabase/students";
import { addLeaveRequest, getLeaveRequestsForUser, LeaveRequest } from "@/lib/supabase/leaves";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, startOfDay } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";


const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const leaveSchema = z.object({
  startDate: z.date({
    required_error: "Start date is required.",
  }),
  endDate: z.date().optional(),
  reason: z.string().min(10, "Reason must be at least 10 characters long."),
  document: z.any()
    .optional()
    .refine((files) => !files || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 1MB.`)
    .refine(
      (files) => !files || files.length === 0 || ACCEPTED_FILE_TYPES.includes(files?.[0]?.type),
      "Only .jpg, .png, .pdf formats are supported."
    ),
});


const getStatusVariant = (status: LeaveRequest["status"]) => {
  switch (status) {
    case "Approved":
      return "success";
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


export default function LeavePageContent() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [pastLeaves, setPastLeaves] = useState<LeaveRequest[]>([]);
  const supabase = createClient();


  useEffect(() => {
    let channel: any;
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        const user = session?.user;
        if(user) {
            setCurrentUser(user);
            const studentProfile = await getStudentByAuthId(user.id);
            setCurrentStudent(studentProfile);
            if (studentProfile) {
               channel = getLeaveRequestsForUser(studentProfile.auth_uid, (leaves) => {
                   setPastLeaves(leaves);
               });
            }
        } else {
            setCurrentUser(null);
            setCurrentStudent(null);
            if (channel) {
                supabase.removeChannel(channel);
            }
        }
    });

    return () => {
        authListener.subscription.unsubscribe();
        if (channel) {
            supabase.removeChannel(channel);
        }
    };
  }, [supabase]);


  const form = useForm<z.infer<typeof leaveSchema>>({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
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
        const newLeave: Omit<LeaveRequest, 'id' | 'document_url'> = {
            user_id: currentStudent.auth_uid,
            userName: currentStudent.name,
            userRole: "Student",
            class: `${currentStudent.class}-${currentStudent.section}`,
            startDate: values.startDate.toISOString(),
            endDate: (values.endDate || values.startDate).toISOString(),
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
            startDate: undefined,
            endDate: undefined,
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

  const today = startOfDay(new Date());


  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Request for Leave</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar 
                                mode="single" 
                                selected={field.value} 
                                onSelect={field.onChange} 
                                initialFocus 
                                disabled={(date) => date < today}
                                classNames={{ day_today: "" }}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                       <FormItem className="flex flex-col">
                        <FormLabel>End Date (Optional)</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar 
                                mode="single" 
                                selected={field.value} 
                                onSelect={field.onChange} 
                                initialFocus 
                                disabled={(date) => date < today}
                                classNames={{ day_today: "" }}
                            />
                          </PopoverContent>
                        </Popover>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Leave History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                {(leave.status === 'Approved' && leave.approverComment) && (
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
