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
import { Phone, Mail, MapPin } from "lucide-react";

export default function HelpPage() {
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
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header title="Help & Support" />
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
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Phone className="h-5 w-5 text-primary" />
                        <p>+91 12345 67890</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Mail className="h-5 w-5 text-primary" />
                        <p>support@hiltonconvent.com</p>
                    </div>
                    <div className="flex items-start gap-4">
                        <MapPin className="h-5 w-5 text-primary mt-1" />
                        <p>123 Education Lane, Knowledge City, New Delhi, India - 110001</p>
                    </div>
                </CardContent>
            </Card>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
