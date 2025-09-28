
"use client";

import { useEffect, useState, Suspense } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { User } from "@supabase/supabase-js";
import { createClient } from '@/lib/supabase/client';
import { getStudentByAuthId, Student } from '@/lib/supabase/students';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { useTheme } from '@/components/theme/ThemeProvider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

function numberToWords(num: number): string {
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


function ReceiptPageContent() {
    const [student, setStudent] = useState<Student | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [receiptNo, setReceiptNo] = useState('');
    
    const { settings } = useTheme();
    const params = useParams();
    const slug = params.slug as string[];
    const supabase = createClient();

    const [session, month] = slug || [];

    useEffect(() => {
        const fetchStudent = async () => {
            setIsLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const studentData = await getStudentByAuthId(user.id);
                setStudent(studentData);
                if (studentData) {
                    const uniqueId = `${Date.now()}`.slice(-5) + studentData.srn.slice(-3);
                    setReceiptNo(`HCSS${uniqueId}`);
                }
            }
            setIsLoading(false);
        };
        fetchStudent();
    }, [supabase]);

    const handlePrint = () => window.print();

    // Mock fee details for now
    const feeAmount = 5000;
    const paymentDate = new Date();

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    if (!student || !session || !month) {
        notFound();
    }

    return (
        <div className="bg-muted/40 p-4 sm:p-8 print:p-0">
            <div className="mx-auto max-w-2xl">
                 <div className="print:hidden mb-4 flex justify-between items-center">
                    <Button asChild variant="outline">
                        <Link href="/fees"><ArrowLeft className="mr-2" /> Back to Fees</Link>
                    </Button>
                    <Button onClick={handlePrint}><Printer className="mr-2" /> Print Receipt</Button>
                </div>
                <div className="bg-card p-6 sm:p-10 shadow-lg print:shadow-none relative z-10 border rounded-lg overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
                        <h1 className="text-[8vw] md:text-[6rem] font-bold text-gray-200/30 transform -rotate-45 select-none whitespace-nowrap opacity-50">
                            {settings.schoolName}
                        </h1>
                    </div>
                    <div className="relative z-10">
                        <header className="flex items-start justify-between pb-4 border-b-2 border-primary">
                            <div className="flex-shrink-0">
                                <Image src={settings.logoUrl || "https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png"} alt="School Logo" width={80} height={80} />
                            </div>
                            <div className="text-center">
                                <h1 className="text-xl font-bold text-primary">{settings.schoolName}</h1>
                                <p className="text-xs text-muted-foreground">Joya Road, Amroha, 244221, Uttar Pradesh</p>
                                <h2 className="text-lg font-semibold mt-2">Fee Receipt</h2>
                            </div>
                            <div className="w-20"/>
                        </header>
                        
                        <section className="my-6 text-sm">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                                <div className="flex justify-between"><span className="font-medium text-muted-foreground">Receipt No:</span><span className="font-semibold">{receiptNo}</span></div>
                                <div className="flex justify-between"><span className="font-medium text-muted-foreground">Date:</span><span className="font-semibold">{paymentDate.toLocaleDateString('en-GB')}</span></div>
                                <div className="flex justify-between"><span className="font-medium text-muted-foreground">Session:</span><span className="font-semibold">{session}</span></div>
                                 <div className="flex justify-between"><span className="font-medium text-muted-foreground">Fee Month:</span><span className="font-semibold">{month}</span></div>
                            </div>
                             <Separator className="my-4" />
                             <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                                 <div className="flex justify-between"><span className="font-medium text-muted-foreground">SRN:</span><span className="font-semibold">{student.srn}</span></div>
                                <div className="flex justify-between"><span className="font-medium text-muted-foreground">Class:</span><span className="font-semibold">{student.class}-{student.section}</span></div>
                                <div className="flex justify-between col-span-2"><span className="font-medium text-muted-foreground">Student's Name:</span><span className="font-semibold">{student.name}</span></div>
                                <div className="flex justify-between col-span-2"><span className="font-medium text-muted-foreground">Father's Name:</span><span className="font-semibold">{student.father_name}</span></div>
                            </div>
                        </section>

                        <section>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[70%]">Particulars</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>Tuition Fee for {month}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(feeAmount)}</TableCell>
                                    </TableRow>
                                </TableBody>
                                <TableFooter>
                                    <TableRow className="bg-secondary">
                                        <TableCell className="font-bold">Total Paid</TableCell>
                                        <TableCell className="text-right font-bold">{formatCurrency(feeAmount)}</TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </section>
                        
                        <section className="mt-6 text-sm">
                            <p><span className="font-medium text-muted-foreground">Amount in Words:</span> {numberToWords(feeAmount)}</p>
                        </section>
                        
                        <footer className="mt-16 border-t pt-4 text-center text-xs text-muted-foreground">
                            <p>This is a computer-generated receipt and does not require a signature.</p>
                            <p>All fees are non-refundable.</p>
                        </footer>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function FeeReceiptPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <ReceiptPageContent />
        </Suspense>
    );
}
