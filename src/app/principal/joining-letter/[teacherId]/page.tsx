
"use client";

import { useEffect, useState } from 'react';
import { getTeacherByAuthId } from '@/lib/supabase/teachers';
import type { Teacher } from '@/lib/supabase/teachers';
import { notFound, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, ClipboardCopy, Info, Phone, Mail, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { getRegistrationKeyForTeacher } from '@/lib/supabase/teachers';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTheme } from '@/components/theme/ThemeProvider';

export default function JoiningLetterPage() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [registrationKey, setRegistrationKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { settings } = useTheme();
  const params = useParams();
  const teacherId = params.teacherId as string;

  useEffect(() => {
    async function fetchTeacher() {
      setIsLoading(true);
      if (teacherId) {
          const teacherData = await getTeacherByAuthId(teacherId);
          if (teacherData) {
            setTeacher(teacherData);
            const regKey = await getRegistrationKeyForTeacher(teacherData.email);
            setRegistrationKey(regKey);
          }
      }
      setIsLoading(false);
    }

    fetchTeacher();
  }, [teacherId]);

  const handlePrint = () => {
    window.print();
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
        title: "Copied to Clipboard",
        description: `${type} has been copied.`
    })
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!teacher) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 print:p-0">
        <div className="fixed inset-0 flex items-center justify-center z-0 pointer-events-none print:hidden">
            <h1 className="text-[12rem] font-bold text-gray-200/50 transform -rotate-45 select-none whitespace-nowrap">
                {settings.schoolName || "Hilton Convent School"}
            </h1>
        </div>

      <div className="mx-auto max-w-4xl bg-white p-8 sm:p-12 shadow-lg print:shadow-none relative z-10 print:border-none">
        
        <header className="flex items-start justify-between pb-6">
            <div className="flex-shrink-0">
                <Image src={settings.logoUrl || "https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png"} alt="School Logo" width={80} height={80} />
            </div>
            <div className="text-right">
                <h1 className="text-3xl font-bold text-primary">{settings.schoolName || "Hilton Convent School"}</h1>
                <p className="text-sm text-muted-foreground mt-1">Joya Road, Amroha, 244221, Uttar Pradesh</p>
                <div className="flex justify-end items-center gap-4 text-xs text-muted-foreground mt-2">
                    <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3" />
                        <span>hiltonconventschool@gmail.com</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3" />
                        <span>+91 9548322595</span>
                    </div>
                </div>
                 <div className="flex justify-end items-center gap-4 text-xs text-muted-foreground mt-1">
                     <div className="flex items-center gap-1.5">
                        <Shield className="h-3 w-3" />
                        <span>CBSE Affiliation No: 2131151</span>
                    </div>
                </div>
            </div>
        </header>

        <div className="w-full h-px bg-gray-200" />


        <div className="flex items-center justify-between mt-8">
            <div/>
            <div className="flex flex-col items-end">
                 <p className="font-semibold">{new Date(teacher.joining_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                 <div className="print:hidden mt-2">
                    <Button onClick={handlePrint}><Printer className="mr-2"/>Print Letter</Button>
                </div>
            </div>
        </div>

        <main className="mt-8 text-lg leading-relaxed">
            <div className="mt-8">
                <p>To,</p>
                <p className="font-semibold">{teacher.name}</p>
                <p>{teacher.address}</p>
            </div>

            <h2 className="mt-12 font-bold text-xl underline underline-offset-4">Subject: Offer of Appointment for the Position of {teacher.subject} Teacher</h2>

            <p className="mt-8">Dear {teacher.name},</p>

            <p className="mt-4">
                We are pleased to offer you the position of <strong>{teacher.subject} Teacher</strong> at {settings.schoolName || "Hilton Convent School"}, effective from {new Date(teacher.joining_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
            </p>

            <p className="mt-4">
                Your role as a {teacher.role === 'classTeacher' ? `Class Teacher for ${teacher.class_teacher_of}`: 'Subject Teacher'} will be integral to our academic team. We were impressed with your qualifications and believe your expertise will be a valuable asset to our students and the school community.
            </p>

            <p className="mt-4">
                We look forward to you joining our team. Please complete your online registration via our Teacher Portal to confirm your acceptance.
            </p>

            <div className="mt-16">
                <p>Sincerely,</p>
                <p className="font-semibold mt-8">Principal</p>
                <p>{settings.schoolName || "Hilton Convent School"}</p>
            </div>
        </main>
        
        <footer className="mt-16 border-t pt-4 text-center text-xs text-muted-foreground">
             <p>This is a computer-generated document and does not require a signature.</p>
            <p className="print:hidden">© {new Date().getFullYear()} {settings.schoolName || "Hilton Convent School"}. All rights reserved.</p>
        </footer>

      </div>
       <div className="mx-auto max-w-4xl mt-8 print:hidden">
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Action Required: Onboarding Instructions for {teacher.name}</AlertTitle>
                <AlertDescription className="space-y-4 mt-2">
                    <p>Please provide the following details to the new teacher so they can register their account on the school portal.</p>
                    {registrationKey ? (
                         <div>
                            <p className="font-semibold">One-Time Registration Key:</p>
                            <div className="flex items-center justify-between rounded-md border bg-secondary p-2 mt-1">
                                <span className="font-mono text-sm">{registrationKey}</span>
                                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(registrationKey, 'Registration Key')}>
                                    <ClipboardCopy className="mr-2" /> Copy Key
                                </Button>
                            </div>
                        </div>
                    ) : (
                         <p className="text-destructive">Registration key could not be found. Please ensure the teacher was registered correctly.</p>
                    )}
                    <div>
                        <p className="font-semibold">Registered Email Address:</p>
                        <div className="flex items-center justify-between rounded-md border bg-secondary p-2 mt-1">
                            <span className="font-mono text-sm">{teacher.email}</span>
                             <Button size="sm" variant="ghost" onClick={() => copyToClipboard(teacher.email, 'Email Address')}>
                                <ClipboardCopy className="mr-2" /> Copy Email
                            </Button>
                        </div>
                    </div>
                     <p className="text-xs text-muted-foreground pt-2">The teacher must use these exact details on the Teacher Login page by clicking `Register your account` to create their account and set a password.</p>
                </AlertDescription>
            </Alert>
       </div>
    </div>
  );
}
