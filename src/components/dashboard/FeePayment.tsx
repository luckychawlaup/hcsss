"use client";
import { useState } from "react";
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

export default function FeePayment() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  const handlePayment = async () => {
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

  return (
    <>
      <Card className="bg-destructive/10 border-destructive/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            Fee Reminder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">₹15,000</div>
          <p className="text-destructive/80">Due by 2024-08-30</p>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => setIsOpen(true)}
          >
            Pay Now
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>
              You are about to pay ₹15,000 for school fees.
            </DialogDescription>
          </DialogHeader>
          {isPaid ? (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <CheckCircle className="h-16 w-16 text-primary" />
              <p className="text-lg font-medium">Payment Successful!</p>
            </div>
          ) : (
            <>
              <div className="py-4">
                <p>
                  <strong>Amount:</strong> ₹15,000
                </p>
                <p>
                  <strong>Due Date:</strong> 2024-08-30
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isPaying}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePayment}
                  disabled={isPaying}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {isPaying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Confirm Payment"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
