
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
  const [isOpen, setIsOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const router = useRouter();

  const nextUnpaidMonth = useMemo(() => {
      const today = startOfToday();
      for (const month of monthOrder) {
          const feeInfo = feeData[month as keyof typeof feeData];
          if (feeInfo && feeInfo.status !== 'paid') {
              const year = new Date().getFullYear(); // This needs to be smarter for Jan/Feb/Mar
              const monthIndex = monthOrder.indexOf(month);
              const dueDate = endOfMonth(new Date(year, monthIndex));

              const fiveDaysBeforeEnd = new Date(dueDate);
              fiveDaysBeforeEnd.setDate(fiveDaysBeforeEnd.getDate() - 5);

              if (isAfter(today, fiveDaysBeforeEnd)) {
                  return {
                      month: month,
                      amount: feeInfo.amount,
                      dueDate: format(dueDate, "yyyy-MM-dd")
                  };
              }
          }
      }
      return null;
  }, []);

  const handlePayment = async () => {
    if (!nextUnpaidMonth) return;
    setIsPaying(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsPaying(false);
    setIsPaid(true);
    setTimeout(() => {
      setIsOpen(false);
      // reset state after closing
      setTimeout(() => {
        setIsPaid(false);
      }, 500);
    }, 2000);
  };

  if (!nextUnpaidMonth) {
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
            <div className="text-2xl font-bold">₹{nextUnpaidMonth.amount.toLocaleString('en-IN')}</div>
            <p className="text-sm text-destructive/80">For {nextUnpaidMonth.month}, Due by {nextUnpaidMonth.dueDate}</p>
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
