
"use client";

import { useState } from "react";
import { format } from "date-fns";
import type { LeaveRequest } from "@/lib/supabase/leaves";
import type { Feedback, FeedbackStatus } from "@/lib/supabase/feedback";
import { getStudentByAuthId, Student } from "@/lib/supabase/students";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CalendarX2, MessageSquare, FileText, Shield, Save, Loader2, MessageCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateFeedback } from "@/lib/supabase/feedback";
import { updateLeaveRequest } from "@/lib/supabase/leaves";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import Link from "next/link";
import { Textarea } from "../ui/textarea";
import { StudentProfile, StudentProfileDetails } from "../profile/ProfileDetails";
import { Skeleton } from "../ui/skeleton";
import { cn } from "@/lib/utils";

type CombinedItem = LeaveRequest | Feedback;

interface ApproveLeavesProps {
  leaves: CombinedItem[];
  title: string;
  isPrincipal?: boolean;
}

const getStatusVariant = (status: CombinedItem['status']) => {
  switch (status) {
    case "Confirmed":
    case "Solved":
      return "success";
    case "Pending":
      return "warning";
    case "Rejected":
      return "destructive";
    case "Incomplete Details":
        return "orange";
    case "Resolving":
      return "info";
    default:
      return "outline";
  }
};

export default function ApproveLeaves({ leaves, title, isPrincipal = false }: ApproveLeavesProps) {
  const { toast } = useToast();
  const [localChanges, setLocalChanges] = useState<Record<string, { status?: CombinedItem['status']; comment?: string }>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const [isStudentDetailOpen, setIsStudentDetailOpen] = useState(false);
  const [selectedStudentDetails, setSelectedStudentDetails] = useState<Student | null>(null);
  const [isLoadingStudent, setIsLoadingStudent] = useState(false);


  const handleViewStudentDetails = async (userId: string) => {
    setIsLoadingStudent(true);
    setIsStudentDetailOpen(true);
    try {
        const student = await getStudentByAuthId(userId);
        if (student) {
            setSelectedStudentDetails(student);
        } else {
            toast({ variant: "destructive", title: "Error", description: "Could not find student details." });
            setIsStudentDetailOpen(false);
        }
    } catch (e) {
        toast({ variant: "destructive", title: "Error", description: "Failed to fetch student details." });
        setIsStudentDetailOpen(false);
    } finally {
        setIsLoadingStudent(false);
    }
  };


  const handleLocalChange = (itemId: string, field: 'status' | 'comment', value: string) => {
    setLocalChanges(prev => ({
        ...prev,
        [itemId]: {
            ...prev[itemId],
            [field]: value
        }
    }));
  };

  const handleSave = async (item: CombinedItem) => {
    const changes = localChanges[item.id];
    if (!changes) {
        toast({ variant: 'destructive', title: 'No changes to save.' });
        return;
    }
    
    setSubmittingId(item.id);

    try {
        const isFeedback = 'category' in item;
        if (isFeedback) {
            await updateFeedback(item.id, { 
                status: changes.status as FeedbackStatus, 
                comment: changes.comment 
            });
        } else {
             await updateLeaveRequest(item.id, { 
                status: changes.status as LeaveRequest['status'], 
                rejectionReason: changes.comment 
            });
        }
        
        toast({
            title: "Status Updated",
            description: "The item has been updated successfully.",
        });
        
        // Clear local changes for this item after saving
        setLocalChanges(prev => {
            const newChanges = { ...prev };
            delete newChanges[item.id];
            return newChanges;
        });

    } catch (error) {
        console.error("Error updating item:", error);
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: "Could not update the item.",
        });
    } finally {
        setSubmittingId(null);
    }
  };


  if (leaves.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
            <CalendarX2 className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Submissions Found</h3>
            <p className="text-muted-foreground mt-2">There are no complaints or leave requests in this category yet.</p>
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
          const currentStatus = localChanges[item.id]?.status || item.status;
          const isActionable = isFeedback && (item.category === "Fee-related Issues" || item.category === "School Portal / IT Issues");
          
          return (
            <Card key={item.id}>
                <CardHeader 
                  className={cn(isActionable && "cursor-pointer hover:bg-secondary/50 transition-colors")}
                  onClick={isActionable ? () => handleViewStudentDetails(item.user_id) : undefined}
                >
                    <div className="flex items-start justify-between">
                        <div>
                        <CardTitle className="flex items-center gap-2">
                          {item.userName}
                          {isActionable && <Info className="h-4 w-4 text-primary" title="Click to view student details"/>}
                        </CardTitle>
                        <CardDescription>
                            {item.userRole === "Student" && item.class ? `Class ${item.class}` : `Teacher`}
                             {isFeedback && <span className="font-semibold"> ({item.category})</span>}
                        </CardDescription>
                        </div>
                        <Badge variant={getStatusVariant(currentStatus)}>{currentStatus}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="font-semibold text-sm">{isFeedback ? item.subject : item.reason}</p>
                    {isFeedback && <p className="text-muted-foreground mt-2">{item.description}</p>}
                    {!isFeedback && (
                        <p className="text-muted-foreground mt-2">
                            From: {format(new Date(item.startDate), "PPP")} To: {format(new Date(item.endDate), "PPP")}
                        </p>
                    )}
                     {item.document_url && (
                        <Button asChild variant="secondary" size="sm">
                            <Link href={item.document_url} target="_blank">
                                <FileText className="mr-2" /> View Document
                            </Link>
                        </Button>
                    )}
                     { isFeedback && item.comment && 
                        <Alert variant="default" className="bg-secondary">
                          <MessageCircle className="h-4 w-4 text-foreground" />
                          <AlertTitle className="font-semibold">Admin Comment</AlertTitle>
                          <AlertDescription>{item.comment}</AlertDescription>
                        </Alert>
                     }
                    { !isFeedback && item.rejectionReason && <Alert variant="destructive"><AlertTitle>Rejection Reason</AlertTitle><AlertDescription>{item.rejectionReason}</AlertDescription></Alert>}
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
                                {isFeedback ? (
                                    <>
                                        <SelectItem value="Pending">Pending</SelectItem>
                                        <SelectItem value="Resolving">Resolving</SelectItem>
                                        <SelectItem value="Solved">Solved</SelectItem>
                                        <SelectItem value="Incomplete Details">Incomplete Details</SelectItem>
                                    </>
                                ) : (
                                    <>
                                        <SelectItem value="Pending">Pending</SelectItem>
                                        <SelectItem value="Confirmed">Confirm</SelectItem>
                                        <SelectItem value="Rejected">Reject</SelectItem>
                                    </>
                                )}
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
    <Dialog open={isStudentDetailOpen} onOpenChange={setIsStudentDetailOpen}>
        <DialogContent className="max-w-xl">
            <DialogHeader>
                <DialogTitle>Student Details</DialogTitle>
                <DialogDescription>
                    Full profile of the student who submitted the complaint.
                </DialogDescription>
            </DialogHeader>
            {isLoadingStudent || !selectedStudentDetails ? (
                 <div className="space-y-4 py-4">
                    <Skeleton className="h-24 w-24 mx-auto rounded-full" />
                    <Skeleton className="h-6 w-1/2 mx-auto" />
                    <Skeleton className="h-4 w-3/4 mx-auto" />
                    <div className="pt-4 grid grid-cols-2 gap-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
            ) : (
                <div className="max-h-[70vh] overflow-y-auto pr-2">
                    <StudentProfile student={selectedStudentDetails} />
                    <div className="p-4">
                         <StudentProfileDetails student={selectedStudentDetails} />
                    </div>
                </div>
            )}
        </DialogContent>
    </Dialog>

    </>
  );
}