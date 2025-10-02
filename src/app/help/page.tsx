
"use client";
import Header from "@/components/dashboard/Header";
import BottomNav from "@/components/dashboard/BottomNav";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Phone, Mail, MapPin, Shield } from "lucide-react";
import { useSchoolInfo } from "@/hooks/use-school-info";
import { Skeleton } from "@/components/ui/skeleton";


function HelpPageContent() {
    const { schoolInfo, isLoading } = useSchoolInfo();
    const faqs = [
        {
          question: "How do I apply for leave?",
          answer: "Navigate to the 'Leave' section from the bottom navigation bar. Fill in the required dates and reason, and then submit the form.",
        },
        {
          question: "Where can I see my report cards?",
          answer: "You can find all your past and current report cards on the homepage. Click on the 'Report Cards' card to view and download them.",
        },
        {
          question: "How do I pay school fees?",
          answer: "On the homepage, you will see a 'Fee Reminder' card if you have pending fees. Click on 'Pay Now' to proceed with the payment.",
        },
        {
            question: "How can I update my profile information?",
            answer: "Go to the 'Profile' section from the bottom navigation. Your details are displayed there. To update any information, please contact the school administration."
        }
    ];

    if(!schoolInfo) {
      return (
        <main className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
             <div className="mx-auto w-full max-w-4xl space-y-6">
                 <Skeleton className="h-48 w-full" />
                 <Skeleton className="h-32 w-full" />
             </div>
        </main>
      )
    }

    return (
        <main className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
            <div className="mx-auto w-full max-w-4xl">
                <Card>
                    <CardHeader>
                        <CardTitle>Frequently Asked Questions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            {faqs.map((faq, index) => (
                                <AccordionItem value={`item-${index}`} key={index}>
                                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                                    <AccordionContent>{faq.answer}</AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                </Card>
            </div>
             <div className="mx-auto w-full max-w-4xl">
                <Card>
                    <CardHeader>
                        <CardTitle>Contact Us</CardTitle>
                    </CardHeader>
                     {isLoading ? (
                        <CardContent className="space-y-4">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-6 w-1/2" />
                            <Skeleton className="h-6 w-1/2" />
                        </CardContent>
                    ) : (
                    <CardContent className="space-y-4">
                         <p className="font-semibold">{schoolInfo.name}</p>
                        <div className="flex items-center gap-4">
                            <Phone className="h-5 w-5 text-primary" />
                            <p>{schoolInfo.phone}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <Mail className="h-5 w-5 text-primary" />
                            <p>{schoolInfo.email}</p>
                        </div>
                        <div className="flex items-start gap-4">
                            <MapPin className="h-5 w-5 text-primary mt-1" />
                            <p>{schoolInfo.address}</p>
                        </div>
                        <div className="flex items-start gap-4">
                            <Shield className="h-5 w-5 text-primary mt-1" />
                            <p>CBSE Affiliation No: {schoolInfo.affiliation_no}<br/>School Code: {schoolInfo.school_code}</p>
                        </div>
                    </CardContent>
                    )}
                </Card>
            </div>
      </main>
    )
}

export default function HelpPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header title="Help & Support" />
      <HelpPageContent/>
      <BottomNav />
    </div>
  );
}
