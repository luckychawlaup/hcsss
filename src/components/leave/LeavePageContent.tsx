"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
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
  Paperclip,
  Send,
  History,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
});

type LeaveRequest = {
  id: number;
  dateFrom: string;
  dateTo?: string;
  reason: string;
  status: "Confirmed" | "Pending" | "Rejected";
};

const pastLeavesData: LeaveRequest[] = [
  {
    id: 1,
    dateFrom: "2024-07-10",
    dateTo: "2024-07-11",
    reason: "Family function.",
    status: "Confirmed",
  },
  {
    id: 2,
    dateFrom: "2024-06-05",
    reason: "Not feeling well.",
    status: "Confirmed",
  },
  {
    id: 3,
    dateFrom: "2024-05-20",
    reason: "Out of station for a wedding.",
    status: "Rejected",
  },
    {
    id: 4,
    dateFrom: "2024-08-01",
    reason: "Personal work.",
    status: "Pending",
  },
];

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


export default function LeavePageContent() {
  const { toast } = useToast();
  const [pastLeaves, setPastLeaves] = useState(pastLeavesData);

  const form = useForm<z.infer<typeof leaveSchema>>({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      dateRange: {
        from: new Date(),
      },
      reason: "",
    },
  });

  const {
    formState: { isSubmitting },
  } = form;

  async function onSubmit(values: z.infer<typeof leaveSchema>) {
    console.log(values);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // Add to past leaves list
    const newLeave: LeaveRequest = {
        id: pastLeaves.length + 1,
        dateFrom: format(values.dateRange.from, "yyyy-MM-dd"),
        dateTo: values.dateRange.to ? format(values.dateRange.to, "yyyy-MM-dd") : undefined,
        reason: values.reason,
        status: "Pending"
    }
    setPastLeaves([newLeave, ...pastLeaves]);

    toast({
      title: "Leave Application Submitted",
      description: "Your leave request has been sent for approval.",
    });
    form.reset({
        dateRange: { from: new Date() },
        reason: "",
        document: undefined
    });
    const fileInput = document.getElementById('leave-document') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Request for Leave</CardTitle>
        </CardHeader>
        <CardContent>
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
                          disabled={{ before: new Date() }}
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
                className="flex items-start justify-between rounded-lg border p-4"
              >
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-sm">
                    {format(new Date(leave.dateFrom), "MMM dd, yyyy")}
                    {leave.dateTo && ` - ${format(new Date(leave.dateTo), "MMM dd, yyyy")}`}
                  </p>
                  <p className="text-muted-foreground text-sm">{leave.reason}</p>
                </div>
                <Badge variant={getStatusVariant(leave.status)}>{leave.status}</Badge>
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
