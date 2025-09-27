
"use client";

import { useEffect, useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getTeacherByAuthId } from '@/lib/supabase/teachers';
import type { Teacher } from '@/lib/supabase/teachers';
import { notFound, useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, Shield, Mail, Phone, Home, User } from 'lucide-react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { getSalarySlipById, SalarySlip } from '@/lib/supabase/salary';
import { Skeleton } from '@/components/ui/skeleton';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

function numberToWords(num: number) {
    if (num === null || num === undefined) return "";
    const a = ['','one ','two ','three ','four ', 'five ','six ','seven ','eight ','nine ','ten ','eleven ','twelve ','thirteen ','fourteen ','fifteen ','sixteen ','seventeen ','eighteen ','nineteen '];
    const b = ['', '', 'twenty','thirty','forty','fifty', 'sixty','seventy','eighty','ninety'];
    
    if ((num.toString()).length > 9) return 'overflow';
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (n[1] != '00') ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
    str += (n[2] != '00') ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
    str += (n[3] != '00') ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
    str += (n[4] != '0') ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
    str += (n[5] != '00') ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    if (str.trim() === '') return 'Zero';
    str = str.trim() + ' only';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function SalarySlipContent() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [salarySlip, setSalarySlip] = useState<SalarySlip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const params = useParams();
  const searchParams = useSearchParams();
  const month = typeof params.month === 'string' ? params.month : '';
  const slipId = searchParams.get('slipId');
  const salaryMonth = month.replace('-', ' ');

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user && slipId) {
          const teacherData = await getTeacherByAuthId(user.id);
          const slipData = await getSalarySlipById(slipId);
          if (teacherData && slipData && slipData.teacherId === teacherData.id) {
            setTeacher(teacherData);
            setSalarySlip(slipData);
          }
      }
      setIsLoading(false);
    }

    fetchData();
  }, [supabase, slipId]);

  const handlePrint = () => {
    window.print();
  };
  
  const totalEarnings = (salarySlip?.basicSalary ?? 0) + (salarySlip?.earnings?.reduce((acc, earn) => acc + earn.amount, 0) ?? 0);
  const totalDeductions = salarySlip?.deductions?.reduce((acc, ded) => acc + ded.amount, 0) ?? 0;
  const netSalary = totalEarnings - totalDeductions;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!teacher || !salarySlip) {
    notFound();
  }

  return (
    <div className="bg-gray-100 p-4 sm:p-8 print:p-0">
       <div className="fixed inset-0 flex items-center justify-center z-0 pointer-events-none print:hidden">
            <div className="text-[10vw] font-bold text-gray-200/50 transform -rotate-45 select-none whitespace-nowrap opacity-50">
                Hilton Convent School
            </div>
        </div>

      <div className="mx-auto max-w-4xl bg-white p-6 sm:p-10 shadow-lg print:shadow-none relative z-10 print:border-none border rounded-lg">
        
        <header className="flex flex-col items-center justify-center border-b-2 border-primary pb-4 text-center">
          <Image src="https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png" alt="Hilton Convent School Logo" width={80} height={80} />
          <h1 className="text-2xl font-bold text-primary mt-2">Hilton Convent School</h1>
          <p className="text-xs text-muted-foreground">Joya Road, Amroha, 244221, Uttar Pradesh</p>
           <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
            <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /><span>hiltonconventschool@gmail.com</span></div>
            <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /><span>+91 9548322595</span></div>
             <div className="flex items-center gap-1.5"><Shield className="h-3 w-3" /><span>CBSE Affiliation: 2131151</span></div>
          </div>
        </header>

        <div className="text-center my-4">
            <h2 className="text-lg font-semibold underline underline-offset-4">Salary Slip for {salaryMonth}</h2>
            <div className="print:hidden mt-4">
                <Button onClick={handlePrint}><Printer className="mr-2"/>Print Slip</Button>
            </div>
        </div>

        <main className="mt-6">
            <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-primary mb-3">Employee Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div className="flex justify-between"><span className="font-medium text-muted-foreground">Employee ID:</span><span>{teacher.auth_uid.substring(0, 10).toUpperCase()}</span></div>
                    <div className="flex justify-between"><span className="font-medium text-muted-foreground">Name:</span><span>{teacher.name}</span></div>
                    <div className="flex justify-between"><span className="font-medium text-muted-foreground">Designation:</span><span>{teacher.subject} Teacher</span></div>
                    <div className="flex justify-between"><span className="font-medium text-muted-foreground">Joining Date:</span><span>{new Date(teacher.joining_date).toLocaleDateString('en-GB')}</span></div>
                    <div className="flex justify-between"><span className="font-medium text-muted-foreground">Bank:</span><span>{teacher.bank_account?.bankName || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="font-medium text-muted-foreground">Account No:</span><span>{teacher.bank_account?.accountNumber || 'N/A'}</span></div>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-4">
                     <h3 className="font-semibold text-green-600 mb-3">Earnings</h3>
                     <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Basic Salary</span><span>{formatCurrency(salarySlip.basicSalary)}</span></div>
                        {salarySlip.earnings?.map((item, index) => (
                            <div key={index} className="flex justify-between">
                                <span className="text-muted-foreground">{item.name}</span>
                                <span>{formatCurrency(item.amount)}</span>
                            </div>
                        ))}
                     </div>
                     <Separator className="my-3"/>
                     <div className="flex justify-between font-bold text-sm">
                        <span>Total Earnings</span>
                        <span>{formatCurrency(totalEarnings)}</span>
                    </div>
                </div>
                 <div className="border rounded-lg p-4">
                     <h3 className="font-semibold text-red-600 mb-3">Deductions</h3>
                     <div className="space-y-2 text-sm">
                        {salarySlip.deductions?.map((item, index) => (
                             <div key={index} className="flex justify-between">
                                <span className="text-muted-foreground">{item.name}</span>
                                <span>{formatCurrency(item.amount)}</span>
                            </div>
                        ))}
                        {(!salarySlip.deductions || salarySlip.deductions.length === 0) && (
                            <p className='text-sm text-muted-foreground'>No deductions</p>
                        )}
                     </div>
                     <Separator className="my-3"/>
                     <div className="flex justify-between font-bold text-sm">
                        <span>Total Deductions</span>
                        <span>{formatCurrency(totalDeductions)}</span>
                    </div>
                </div>
            </div>

             <div className="mt-6 border-t-2 border-primary pt-3">
                <div className="flex justify-between items-center font-bold text-lg p-4 bg-primary/10 rounded-lg">
                    <span>Net Salary</span>
                    <span>{formatCurrency(netSalary)}</span>
                </div>
                <p className="text-right text-sm font-medium mt-2 capitalize">
                    (In Words: {numberToWords(netSalary)})
                </p>
            </div>
        </main>
        
        <footer className="mt-8 border-t pt-2 text-center text-xs text-muted-foreground">
             <p>This is a computer-generated document and does not require a signature.</p>
        </footer>

      </div>
    </div>
  );
}

export default function SalarySlipPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
      <SalarySlipContent />
    </Suspense>
  )
}
