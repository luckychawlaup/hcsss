
"use client";

import { useState } from "react";
import { format } from "date-fns";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarX2, Save, Loader2, FileText, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateLeaveRequest } from "@/lib/supabase/leaves";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import Link from "next/link";
import { Textarea } from "../ui/textarea";

interface ApproveLeavesProps {
  leaves: LeaveRequest[];
  isPrincipal?: boolean;
}

const getStatusVariant = (status: LeaveRequest['status']) => {
  switch (status) {
    case "Approved":
      return "success";
    case "Pending":
      return "warning";
    case "Rejected":
      return "destructive";
    default:
      return "outline";
  }
};

export default function ApproveLeaves({ leaves, isPrincipal = false }: ApproveLeavesProps) {
  const { toast } = useToast();
  const [localChanges, setLocalChanges] = useState<Record<string, { status?: LeaveRequest['status']; comment?: string }>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const handleLocalChange = (itemId: string, field: 'status' | 'comment', value: string) => {
    setLocalChanges(prev => ({
        ...prev,
        [itemId]: {
            ...prev[itemId],
            [field]: value
        }
    }));
  };

  const handleSave = async (item: LeaveRequest) => {
    const changes = localChanges[item.id];
    if (!changes) {
        toast({ variant: 'destructive', title: 'No changes to save.' });
        return;
    }
    
    setSubmittingId(item.id);

    try {
        const updatePayload: Partial<Pick<LeaveRequest, 'status' | 'rejectionReason' | 'approverComment'>> = {};
        if (changes.status) {
            updatePayload.status = changes.status;
        }
        if (changes.comment) {
            if (changes.status === 'Rejected') {
                updatePayload.rejectionReason = changes.comment;
            } else {
                updatePayload.approverComment = changes.comment;
            }
        }
        
        await updateLeaveRequest(item.id, updatePayload);
        
        toast({
            title: "Status Updated",
            description: "The leave request has been updated successfully.",
        });
        
        // Clear local changes for this item after saving
        setLocalChanges(prev => {
            const newChanges = { ...prev };
            delete newChanges[item.id];
            return newChanges;
        });

    } catch (error) {
        console.error("Error updating leave request:", error);
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: "Could not update the leave request.",
        });
    } finally {
        setSubmittingId(null);
    }
  };


  if (leaves.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
            <CalendarX2 className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Pending Leave Requests</h3>
            <p className="text-muted-foreground mt-2">
                There are no new leave requests to review at this time.
            </p>
        </div>
    );
  }

  return (
    <>
    <div className="space-y-4">
        {leaves.map((item) => {
          const currentStatus = localChanges[item.id]?.status || item.status;
          
          return (
            <Card key={item.id}>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                            {item.userName}
                            </CardTitle>
                            <CardDescription>
                                {item.userRole === "Student" && item.class ? `Class ${item.class}` : `Teacher`}
                            </CardDescription>
                        </div>
                        <Badge variant={getStatusVariant(currentStatus)}>{currentStatus}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="font-semibold text-sm">{item.reason}</p>
                    <p className="text-muted-foreground mt-2">
                        From: {format(new Date(item.startDate), "PPP")} To: {format(new Date(item.endDate), "PPP")}
                    </p>
                     {item.document_url && (
                        <Button asChild variant="secondary" size="sm">
                            <Link href={item.document_url} target="_blank">
                                <FileText className="mr-2" /> View Document
                            </Link>
                        </Button>
                    )}
                     { item.approverComment && 
                        <Alert variant="default" className="bg-secondary">
                          <AlertTitle className="font-semibold">Your Comment</AlertTitle>
                          <AlertDescription>{item.approverComment}</AlertDescription>
                        </Alert>
                     }
                    { item.rejectionReason && <Alert variant="destructive"><AlertTitle>Rejection Reason</AlertTitle><AlertDescription>{item.rejectionReason}</AlertDescription></Alert>}
                </CardContent>
                <CardFooter className="flex flex-col gap-2 items-end">
                     <div className="w-full space-y-2">
                        <Textarea 
                            placeholder="Add a comment or reason (optional)..."
                            value={localChanges[item.id]?.comment || ''}
                            onChange={(e) => handleLocalChange(item.id, 'comment', e.target.value)}
                        />
                        <div className="flex justify-between items-center w-full">
                            <Select onValueChange={(newStatus) => handleLocalChange(item.id, 'status', newStatus)} defaultValue={item.status}>
                                <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Update status..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="Approved">Approve</SelectItem>
                                    <SelectItem value="Rejected">Reject</SelectItem>
                                </SelectContent>
                            </Select>
                             <Button onClick={() => handleSave(item)} disabled={!localChanges[item.id] || submittingId === item.id}>
                                {submittingId === item.id ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                                Save
                            </Button>
                        </div>
                    </div>
                </CardFooter>
            </Card>
        )})}
    </div>
    </>
  );
}
