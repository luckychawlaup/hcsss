

"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, addMonths, differenceInDays, startOfDay } from "date-fns";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Calendar as CalendarIcon,
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
  dateRange: z.object(
    {
      from: z.date({ required_error: "Start date is required." }),
      to: z.date().optional(),
    },
    { required_error: "Please select a date or date range." }
  ),
  reason: z.string().min(10, "Reason must be at least 10 characters long."),
  document: z.any().optional(),
}).refine(data => {
    if (data.dateRange.to) {
        return differenceInDays(data.dateRange.to, data.dateRange.from) <= 30;
    }
    return true;
}, {
    message: "Leave duration cannot exceed 30 days.",
    path: ["dateRange"],
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
               const unsubscribeLeaves = getLeaveRequestsForUser(studentProfile.id, (leaves) => {
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
      dateRange: {
        from: startOfDay(new Date()),
      },
      reason: "",
    },
  });

  const {
    formState: { isSubmitting },
  } = form;
  
  const fromDate = form.watch("dateRange.from");

  async function onSubmit(values: z.infer<typeof leaveSchema>) {
    if(!currentUser || !currentStudent) {
        toast({ variant: 'destructive', title: "Error", description: "You must be logged in to apply for leave."});
        return;
    }
    
    const startDate = values.dateRange.from.toISOString();
    const endDate = (values.dateRange.to || values.dateRange.from).toISOString();

    const newLeave: Omit<LeaveRequest, 'id'> = {
        userId: currentStudent.id,
        userName: currentStudent.name,
        class: `${currentStudent.class}-${currentStudent.section}`,
        userRole: "Student",
        startDate,
        endDate,
        reason: values.reason,
        status: "Pending",
        appliedAt: new Date().toISOString(),
    }

    try {
        await addLeaveRequest(newLeave);
        toast({
            title: "Leave Application Submitted",
            description: "Your leave request has been sent for approval.",
        });
        form.reset({
            dateRange: { from: startOfDay(new Date()) },
            reason: "",
            document: undefined
        });
        const fileInput = document.getElementById('leave-document') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
    } catch(error) {
         toast({ variant: 'destructive', title: "Submission Failed", description: "Could not submit your leave request. Please try again."});
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="dateRange"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Leave Dates</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value?.from && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value?.from ? (
                              field.value.to ? (
                                <>
                                  {format(field.value.from, "LLL dd, y")} -{" "}
                                  {format(field.value.to, "LLL dd, y")}
                                </>
                              ) : (
                                format(field.value.from, "LLL dd, y")
                              )
                            ) : (
                              <span>Pick a date or range</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={field.value?.from}
                          selected={{ from: field.value?.from, to: field.value?.to }}
                          onSelect={field.onChange}
                          numberOfMonths={1}
                          disabled={{ before: startOfDay(new Date()) }}
                          toDate={fromDate ? addMonths(fromDate, 1) : undefined}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

    