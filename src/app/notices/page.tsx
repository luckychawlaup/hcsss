import Header from "@/components/dashboard/Header";
import BottomNav from "@/components/dashboard/BottomNav";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";

const notices = [
  {
    id: 1,
    title: "Annual Sports Day",
    date: "2024-08-25",
    category: "Event",
    content: "The Annual Sports Day will be held on 15th September 2024. All students are requested to participate.",
  },
  {
    id: 2,
    title: "Fee Payment Deadline",
    date: "2024-08-20",
    category: "Urgent",
    content: "The deadline for fee payment for the next quarter is 30th August 2024. Please pay on time to avoid late fees.",
  },
  {
    id: 3,
    title: "Parent-Teacher Meeting",
    date: "2024-08-18",
    category: "Meeting",
    content: "A Parent-Teacher Meeting is scheduled for 28th August 2024 to discuss the mid-term performance.",
  },
  {
    id: 4,
    title: "Holiday on Janmashtami",
    date: "2024-08-15",
    category: "Holiday",
    content: "The school will remain closed on 26th August 2024 on account of Janmashtami.",
  },
];

const getCategoryVariant = (category: string) => {
  switch (category) {
    case "Urgent":
      return "destructive";
    case "Event":
      return "default";
    default:
      return "secondary";
  }
};

export default function NoticesPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header title="Notices" />
      <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
        <div className="mx-auto w-full max-w-4xl space-y-6">
          {notices.map((notice) => (
            <Card key={notice.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle>{notice.title}</CardTitle>
                        <CardDescription>{new Date(notice.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</CardDescription>
                    </div>
                    <Badge variant={getCategoryVariant(notice.category)}>{notice.category}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{notice.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
