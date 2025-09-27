
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Circle, Banknote, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "../ui/separator";
import { Checkbox } from "../ui/checkbox";
import { Alert, AlertDescription } from "../ui/alert";
import { endOfMonth, isAfter, isBefore, startOfToday } from "date-fns";

// Mock data, this will eventually come from your backend
const feeData = {
  "2024-2025": {
    "April": { status: "paid", amount: 5000 },
    "May": { status: "paid", amount: 5000 },
    "June": { status: "paid", amount: 5000 },
    "July": { status: "pending", amount: 5000 },
    "August": { status: "pending", amount: 5000 },
    "September": { status: "pending", amount: 5000 },
    "October": { status: "pending", amount: 5000 },
    "November": { status: "pending", amount: 5000 },
    "December": { status: "pending", amount: 5000 },
    "January": { status: "pending", amount: 5000 },
    "February": { status: "pending", amount: 5000 },
    "March": { status: "pending", amount: 5000 },
  }
};

const monthMap: { [key: string]: number } = { "April": 3, "May": 4, "June": 5, "July": 6, "August": 7, "September": 8, "October": 9, "November": 10, "December": 11, "January": 0, "February": 1, "March": 2 };

const getMonthStatus = (month: string, status: "paid" | "pending", session: string): MonthStatus => {
    if (status === 'paid') return 'paid';

    const today = startOfToday();
    const year = monthMap[month] >= 3 ? parseInt(session.split('-')[0]) : parseInt(session.split('-')[1]);
    const monthEndDate = endOfMonth(new Date(year, monthMap[month]));

    if (isAfter(today, monthEndDate)) return 'overdue';

    const fiveDaysBeforeEnd = new Date(monthEndDate);
    fiveDaysBeforeEnd.setDate(fiveDaysBeforeEnd.getDate() - 5);

    if (isAfter(today, fiveDaysBeforeEnd)) return 'due';

    return 'pending';
}


type MonthStatus = "paid" | "due" | "overdue" | "pending";

const StatusIcon = ({ status }: { status: MonthStatus }) => {
  switch (status) {
    case "paid":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case "due":
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case "overdue":
      return <XCircle className="h-5 w-5 text-red-500" />;
    case "pending":
    default:
      return <Circle className="h-5 w-5 text-muted-foreground/50" />;
  }
};

const StatusBadge = ({ status }: { status: MonthStatus }) => {
    const baseClasses = "text-xs font-semibold px-2 py-0.5 rounded-full";
    switch (status) {
        case "paid":
            return <span className={cn(baseClasses, "bg-green-100 text-green-700")}>Paid</span>
        case "due":
             return <span className={cn(baseClasses, "bg-yellow-100 text-yellow-700")}>Due</span>
        case "overdue":
             return <span className={cn(baseClasses, "bg-red-100 text-red-700")}>Overdue</span>
        case "pending":
        default:
            return <span className={cn(baseClasses, "bg-secondary text-secondary-foreground")}>Upcoming</span>
    }
}


export default function FeeStatus() {
  const [currentSession, setCurrentSession] = useState("2024-2025");
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  
  const sessionData = feeData[currentSession as keyof typeof feeData];
  const allMonths = Object.keys(sessionData);

  const firstUnpaidMonthIndex = useMemo(() => {
    return allMonths.findIndex(month => sessionData[month as keyof typeof sessionData].status !== 'paid');
  }, [allMonths, sessionData]);

  const handleMonthSelection = (month: string) => {
    setSelectedMonths(prev => {
        const monthIndex = allMonths.indexOf(month);
        // If we are selecting a month
        if (!prev.includes(month)) {
            // Add all months from the first unpaid up to the selected one
            const newSelection = allMonths.slice(firstUnpaidMonthIndex, monthIndex + 1);
            return newSelection;
        } else {
            // If we are deselecting a month, deselect it and all subsequent months
            return allMonths.slice(firstUnpaidMonthIndex, monthIndex);
        }
    });
  };
  
  const totalSelectedAmount = useMemo(() => {
    return selectedMonths.reduce((acc, month) => acc + sessionData[month as keyof typeof sessionData].amount, 0);
  }, [selectedMonths, sessionData]);

  useEffect(() => {
      setSelectedMonths([]);
  }, [currentSession]);


  const QuarterCard = ({ title, months }: { title: string, months: string[] }) => {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {months.map(month => {
            const monthData = sessionData[month as keyof typeof sessionData];
            const monthIndex = allMonths.indexOf(month);
            const isSelectable = monthData.status !== 'paid' && monthIndex >= firstUnpaidMonthIndex;
            const currentMonthStatus = getMonthStatus(month, monthData.status, currentSession);
            
            return (
                <div key={month} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                    {isSelectable ? (
                        <Checkbox
                            id={month}
                            checked={selectedMonths.includes(month)}
                            onCheckedChange={() => handleMonthSelection(month)}
                        />
                    ) : (
                        <StatusIcon status={currentMonthStatus} />
                    )}
                    <label htmlFor={month} className={cn("font-medium", !isSelectable && "cursor-not-allowed text-muted-foreground")}>{month}</label>
                    </div>
                    <div className="flex items-center gap-4">
                    <p className="text-sm text-muted-foreground w-20 text-right">₹{monthData.amount.toLocaleString('en-IN')}</p>
                    <div className="w-20 text-center">
                        <StatusBadge status={currentMonthStatus} />
                    </div>
                    </div>
                </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
        <div className="text-center">
            <h1 className="text-2xl font-bold">Fee Status for Session {currentSession}</h1>
            <p className="text-muted-foreground">Review your payments and select months to pay.</p>
        </div>
        
         <Alert className="bg-primary/10 border-primary/20 text-primary-foreground">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-primary/90">
                It is advisable to pay fees on a quarterly basis to avoid any late charges. You can select multiple months to pay at once, but they must be sequential.
            </AlertDescription>
        </Alert>

        <Separator />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <QuarterCard title="Quarter 1" months={["April", "May", "June"]} />
            <QuarterCard title="Quarter 2" months={["July", "August", "September"]} />
            <QuarterCard title="Quarter 3" months={["October", "November", "December"]} />
            <QuarterCard title="Quarter 4" months={["January", "February", "March"]} />
        </div>
        
        {selectedMonths.length > 0 && (
            <Card className="sticky bottom-24 md:bottom-4 z-10 shadow-lg border-primary/20">
                <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <p className="font-semibold">{selectedMonths.length} month(s) selected: <span className="text-muted-foreground text-sm">{selectedMonths.join(', ')}</span></p>
                        <p className="text-xl font-bold">Total Amount: ₹{totalSelectedAmount.toLocaleString('en-IN')}</p>
                    </div>
                    <Button size="lg" className="w-full sm:w-auto">
                        <Banknote className="mr-2" />
                        Pay Selected Amount
                    </Button>
                </CardContent>
            </Card>
        )}
    </div>
  );
}
