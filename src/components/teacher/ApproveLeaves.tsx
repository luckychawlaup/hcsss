

"use client";

import { useState } from "react";
import { format } from "date-fns";
import type { LeaveRequest } from "@/lib/supabase/leaves";
import type { Feedback, FeedbackStatus } from "@/lib/supabase/feedback";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarX2, MessageSquare, FileText, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateFeedback } from "@/lib/supabase/feedback";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import Link from "next/link";

type CombinedItem = LeaveRequest | Feedback;

interface ApproveLeavesProps {
  leaves: CombinedItem[];
  title: string;
  isPrincipal?: boolean;
}

const getStatusVariant = (status: CombinedItem["status"]) => {
  switch (status) {
    case "Confirmed":
    case "Solved":
      return "success";
    case "Pending":
      return "secondary";
    case "Rejected":
    case "Incomplete Details":
      return "destructive";
    case "Resolving":
      return "default";
    default:
      return "outline";
  }
};

export default function ApproveLeaves({ leaves, title, isPrincipal = false }: ApproveLeavesProps) {
  const { toast } = useToast();

  const handleStatusChange = async (itemId: string, newStatus: FeedbackStatus) => {
    try {
      await updateFeedback(itemId, { status: newStatus });
      toast({
        title: "Status Updated",
        description: "The complaint status has been updated.",
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update the complaint status.",
      });
    }
  };

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
        {title === "your students" && (
             <Alert variant="default" className="bg-blue-50 border-blue-200">
                <Shield className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800 font-semibold">Student Anonymity Notice</AlertTitle>
                <AlertDescription className="text-blue-700">
                    For most categories, student identity is kept anonymous to protect their privacy. For issues requiring direct follow-up (like 'Fee-related' or 'IT Issues'), the student's name is shown.
                </AlertDescription>
            </Alert>
        )}
        {leaves.map((item) => {
          const isFeedback = 'category' in item;
          
          return (
            <Card key={item.id}>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                        <CardTitle>{item.userName}</CardTitle>
                        <CardDescription>
                            {item.userRole === "Student" ? `Class ${item.class}` : `Teacher`}
                             {isFeedback && <span className="font-semibold"> ({item.category})</span>}
                        </CardDescription>
                        </div>
                        <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="font-semibold text-sm">{isFeedback ? item.subject : item.reason}</p>
                    {isFeedback && <p className="text-muted-foreground mt-2">{item.description}</p>}
                    {!isFeedback && (
                        <p className="text-muted-foreground mt-2">
                            From: {format(new Date(item.startDate), "PPP")} To: {format(new Date(item.endDate), "PPP")}
                        </p>
                    )}
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2 justify-end">
                    {item.document_url && (
                        <Button asChild variant="secondary" size="sm">
                            <Link href={item.document_url} target="_blank">
                                <FileText className="mr-2" /> View Document
                            </Link>
                        </Button>
                    )}
                    {isFeedback && (
                      <Select onValueChange={(newStatus) => handleStatusChange(item.id, newStatus as FeedbackStatus)} defaultValue={item.status}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Update status..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Resolving">Resolving</SelectItem>
                          <SelectItem value="Solved">Solved</SelectItem>
                          <SelectItem value="Incomplete Details">Incomplete Details</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                </CardFooter>
            </Card>
        )})}
    </div>
    </>
  );
}
