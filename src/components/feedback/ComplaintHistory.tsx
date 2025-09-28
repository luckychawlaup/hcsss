

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getFeedbackForUser, Feedback, FeedbackStatus } from "@/lib/supabase/feedback";
import { getRole } from "@/lib/getRole";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { History, Loader2, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertTitle, AlertDescription } from "../ui/alert";

const getStatusVariant = (status: Feedback["status"]) => {
  switch (status) {
    case "Solved":
      return "success";
    case "Pending":
      return "secondary";
    case "Incomplete Details":
      return "destructive";
    case "Resolving":
      return "default"
    default:
      return "outline";
  }
};

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), "do MMM, yyyy 'at' p");
};

export default function ComplaintHistory() {
  const [history, setHistory] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    let channel: any;

    const fetchHistory = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const userRole = await getRole(user);
        setRole(userRole);

        if (userRole === 'student') {
          channel = getFeedbackForUser(user.id, (data) => {
            setHistory(data);
            setIsLoading(false);
          });
        } else {
            setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    fetchHistory();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase]);

  // Only render for students
  if (role !== 'student') {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          My Complaint History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
            <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        ) : history.length > 0 ? (
          history.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-2 rounded-lg border p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-sm">{item.subject}</p>
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
              </div>
              
              {item.comment && (
                <Alert variant="default" className="mt-2 bg-secondary">
                  <MessageCircle className="h-4 w-4" />
                  <AlertTitle>Admin Comment</AlertTitle>
                  <AlertDescription>{item.comment}</AlertDescription>
                </Alert>
              )}

              <p className="text-xs text-muted-foreground pt-2 border-t mt-2">
                Submitted on {formatDate(item.created_at)}
              </p>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground text-center py-4">
            You haven't submitted any complaints or feedback yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
