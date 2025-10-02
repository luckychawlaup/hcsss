
"use client";

import { useState, useEffect } from "react";
import Header from "@/components/dashboard/Header";
import BottomNav from "@/components/dashboard/BottomNav";
import { createClient } from "@/lib/supabase/client";
import { Student } from "@/lib/supabase/students";
import { Fee } from "@/lib/supabase/fees";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, Receipt, Download, X } from "lucide-react";
import { useSchoolInfo } from "@/hooks/use-school-info";
import Image from 'next/image';

function FeeReceipt({ fee, student, schoolName }: { fee: Fee, student: Student, schoolName: string }) {
    const borderText = schoolName.toUpperCase() + " ";

    return (
        <DialogContent className="sm:max-w-md p-0">
            <div className="relative p-6 bg-white dark:bg-gray-900 text-black dark:text-white">
                {/* Text Border */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <div className="absolute -top-1 left-0 h-4 text-[8px] leading-none whitespace-nowrap text-gray-200 dark:text-gray-700" style={{ writingMode: 'horizontal-tb' }}>{borderText.repeat(50)}</div>
                    <div className="absolute -bottom-1 left-0 h-4 text-[8px] leading-none whitespace-nowrap text-gray-200 dark:text-gray-700" style={{ writingMode: 'horizontal-tb' }}>{borderText.repeat(50)}</div>
                    <div className="absolute top-0 -left-1 w-4 text-[8px] leading-none whitespace-nowrap text-gray-200 dark:text-gray-700 origin-top-left" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{borderText.repeat(50)}</div>
                    <div className="absolute top-0 -right-1 w-4 text-[8px] leading-none whitespace-nowrap text-gray-200 dark:text-gray-700 origin-top-right" style={{ writingMode: 'vertical-rl' }}>{borderText.repeat(50)}</div>
                </div>

                <div className="relative z-10">
                    <DialogHeader className="text-center border-b pb-4">
                        <Image src="/hcsss.png" alt="School Logo" width={60} height={60} className="mx-auto" />
                        <DialogTitle className="text-2xl font-bold mt-2">{schoolName}</DialogTitle>
                        <p className="text-sm text-gray-500">Official Fee Receipt</p>
                    </DialogHeader>
                    <div className="mt-6 space-y-4 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Receipt No:</span>
                            <span className="font-mono">{fee.id?.split('-')[0].toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Payment Date:</span>
                            <span>{new Date(fee.updated_at!).toLocaleDateString('en-GB')}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Student Name:</span>
                            <span className="font-semibold">{student.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Class:</span>
                            <span>{student.class}-{student.section}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">SRN:</span>
                            <span>{student.srn}</span>
                        </div>

                        <div className="border-t border-dashed my-4"></div>

                        <div className="flex justify-between font-semibold">
                            <span>Fee for Month:</span>
                            <span>{fee.month}</span>
                        </div>
                        <div className="flex justify-between text-xl font-bold text-green-600 border-t border-dashed pt-4 mt-4">
                            <span>Amount Paid:</span>
                            <span>₹{fee.amount.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                     <div className="mt-8 text-center text-xs text-gray-400">
                        This is a computer-generated receipt.
                    </div>
                </div>
            </div>
             <div className="p-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-2">
                <Button variant="outline" onClick={() => window.print()}><Download className="mr-2"/>Print</Button>
            </div>
        </DialogContent>
    );
}

function FeeHistory() {
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
  const { schoolInfo, isLoading: isSchoolInfoLoading } = useSchoolInfo();

  // Dummy data for testing
  const dummyStudent: Student = {
      id: 'dummy-student-id',
      auth_uid: 'dummy-auth-id',
      srn: 'HCS0001',
      name: 'Test Student',
      email: 'student@test.com',
      father_name: 'Test Father',
      mother_name: 'Test Mother',
      address: '123 Test Street',
      class: '10',
      section: 'A',
      admission_date: new Date().toISOString(),
      date_of_birth: '01/01/2008'
  };

  const dummyFees: Fee[] = [
      { id: 'fee-1', student_id: 'dummy-student-id', month: 'April', status: 'paid', amount: 5000, updated_at: '2024-04-05T10:00:00Z' },
      { id: 'fee-2', student_id: 'dummy-student-id', month: 'May', status: 'paid', amount: 5000, updated_at: '2024-05-06T10:00:00Z' },
      { id: 'fee-3', student_id: 'dummy-student-id', month: 'June', status: 'due', amount: 5000 },
      { id: 'fee-4', student_id: 'dummy-student-id', month: 'July', status: 'overdue', amount: 5000 },
  ];

  const academicMonths = [
    "April", "May", "June", "July", "August", "September", 
    "October", "November", "December", "January", "February", "March"
  ];

  const feeStatusByMonth = academicMonths.map(month => {
    const feeRecord = dummyFees.find(f => f.month === month);
    return {
      month: month,
      status: feeRecord?.status || 'pending',
      amount: feeRecord?.amount || 5000,
      updated_at: feeRecord?.updated_at,
      id: feeRecord?.id,
    };
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'success';
      case 'due': return 'warning';
      case 'overdue': return 'destructive';
      default: return 'outline';
    }
  };

  if (isSchoolInfoLoading) {
    return <div className="p-8 space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>;
  }

  return (
    <>
      <div className="space-y-4">
        {feeStatusByMonth.map((fee) => (
          <Card key={fee.month} className="overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">{fee.month}</p>
                <p className="text-sm text-muted-foreground">Amount: ₹{fee.amount.toLocaleString('en-IN')}</p>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant={getStatusVariant(fee.status)} className="capitalize">{fee.status}</Badge>
                {fee.status === 'paid' ? (
                  <Button variant="outline" size="sm" onClick={() => setSelectedFee(fee as Fee)}>
                    <Receipt className="mr-2 h-4 w-4" /> View Receipt
                  </Button>
                ) : (
                  <Button disabled>Pay Now</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
       {selectedFee && dummyStudent && (
        <Dialog open={!!selectedFee} onOpenChange={() => setSelectedFee(null)}>
          <FeeReceipt fee={selectedFee} student={dummyStudent} schoolName={schoolInfo?.name || "Hilton Convent School"} />
        </Dialog>
      )}
    </>
  );
}

export default function FeesPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
        <div className="flex flex-1 flex-col">
            <Header title="Fee Status" />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24">
                <FeeHistory />
            </main>
        </div>
        <BottomNav />
    </div>
  );
}
