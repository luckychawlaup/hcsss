
"use client";
import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { DollarSign, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { endOfMonth, format, isAfter, startOfToday } from "date-fns";
import { useRouter } from "next/navigation";

// This should come from a user-specific context or prop
const feeData = {
    "April": { status: "paid", amount: 5000 },
    "May": { status: "paid", amount: 5000 },
    "June": { status: "paid", amount: 5000 },
    "July": { status: "pending", amount: 5000 },
    "August": { status: "pending", amount: 5000 },
};

const monthOrder = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];


export default function FeePayment() {
  const router = useRouter();

  const dueFeeDetails = useMemo(() => {
    const today = startOfToday();
    let totalDueAmount = 0;
    const dueMonths: string[] = [];
    let lastDueDate: string | null = null;

    for (const month of monthOrder) {
      const feeInfo = feeData[month as keyof typeof feeData];
      if (feeInfo && feeInfo.status === 'pending') {
        const year = new Date().getFullYear(); // This needs to be smarter for Jan/Feb/Mar for sessions spanning years
        const monthIndex = monthOrder.indexOf(month);
        const dueDate = endOfMonth(new Date(year, monthIndex));
        
        const reminderStartDate = new Date(dueDate);
        reminderStartDate.setDate(reminderStartDate.getDate() - 5);
        
        if (isAfter(today, reminderStartDate)) {
          totalDueAmount += feeInfo.amount;
          dueMonths.push(month);
          lastDueDate = format(endOfMonth(new Date(year, monthIndex)), "do MMM, yyyy");
        }
      }
    }

    if (totalDueAmount > 0) {
      return {
        amount: totalDueAmount,
        months: dueMonths.join(', '),
        dueDate: lastDueDate
      };
    }
    
    return null;
  }, []);

  if (!dueFeeDetails) {
    return null; // Don't show the card if there's no upcoming due fee
  }

  return (
    <>
      <Card className="bg-destructive/10 border-destructive/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Fee Reminder
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">₹{dueFeeDetails.amount.toLocaleString('en-IN')}</div>
            <p className="text-sm text-destructive/80">Total due for {dueFeeDetails.months}.</p>
            <p className="text-xs text-destructive/80">Next due date is {dueFeeDetails.dueDate}.</p>
          </div>
           <Button
            size="sm"
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => router.push('/fees')}
          >
            Pay Now
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
