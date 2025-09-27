
"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Circle, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "../ui/separator";

// Mock data, this will eventually come from your backend
const feeData = {
  "2024-2025": {
    "April": { status: "paid", amount: 5000, dueDate: "2024-04-10" },
    "May": { status: "paid", amount: 5000, dueDate: "2024-05-10" },
    "June": { status: "paid", amount: 5000, dueDate: "2024-06-10" },
    "July": { status: "due", amount: 5000, dueDate: "2024-07-10" },
    "August": { status: "pending", amount: 5000, dueDate: "2024-08-10" },
    "September": { status: "pending", amount: 5000, dueDate: "2024-09-10" },
    "October": { status: "pending", amount: 5000, dueDate: "2024-10-10" },
    "November": { status: "pending", amount: 5000, dueDate: "2024-11-10" },
    "December": { status: "pending", amount: 5000, dueDate: "2024-12-10" },
    "January": { status: "pending", amount: 5000, dueDate: "2025-01-10" },
    "February": { status: "pending", amount: 5000, dueDate: "2025-02-10" },
    "March": { status: "pending", amount: 5000, dueDate: "2025-03-10" },
  }
};

type MonthStatus = "paid" | "due" | "overdue" | "pending";

const StatusIcon = ({ status }: { status: MonthStatus }) => {
  switch (status) {
    case "paid":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case "due":
      return <Circle className="h-5 w-5 text-yellow-500" />;
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


const QuarterCard = ({ title, months, data }: { title: string, months: string[], data: any }) => {
  const totalAmount = months.reduce((acc, month) => acc + (data[month]?.amount || 0), 0);
  const isPayable = months.some(month => data[month]?.status === 'due' || data[month]?.status === 'overdue');
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>Total: ₹{totalAmount.toLocaleString('en-IN')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {months.map(month => (
          <div key={month} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusIcon status={data[month]?.status} />
              <p className="font-medium">{month}</p>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground w-20 text-right">₹{data[month]?.amount.toLocaleString('en-IN')}</p>
              <div className="w-20 text-center">
                 <StatusBadge status={data[month]?.status} />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
       {isPayable && (
          <CardFooter>
            <Button className="w-full">
              <Banknote className="mr-2" />
              Pay for {title}
            </Button>
          </CardFooter>
        )}
    </Card>
  );
};

export default function FeeStatus() {
  const [currentSession, setCurrentSession] = useState("2024-2025");
  const sessionData = feeData[currentSession as keyof typeof feeData];

  return (
    <div className="space-y-6">
        <div className="text-center">
            <h1 className="text-2xl font-bold">Fee Status for Session {currentSession}</h1>
            <p className="text-muted-foreground">Review your payments and upcoming due dates.</p>
        </div>
        <Separator />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <QuarterCard title="Quarter 1" months={["April", "May", "June"]} data={sessionData} />
            <QuarterCard title="Quarter 2" months={["July", "August", "September"]} data={sessionData} />
            <QuarterCard title="Quarter 3" months={["October", "November", "December"]} data={sessionData} />
            <QuarterCard title="Quarter 4" months={["January", "February", "March"]} data={sessionData} />
        </div>
    </div>
  );
}
