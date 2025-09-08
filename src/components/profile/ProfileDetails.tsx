import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  User,
  Users,
  Mail,
  Phone,
  BookOpen,
  Calendar,
  Heart,
  Home,
  Bus,
  Hash,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const DetailItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
  <div className="flex items-center gap-4">
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
      {icon}
    </div>
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-semibold text-sm">{value}</p>
    </div>
  </div>
);

export default function ProfileDetails() {
  const student = {
    name: "Siddharth Sharma",
    class: "10",
    section: "A",
    avatarUrl: "https://picsum.photos/200/200",
    srNumber: "S20240187",
    fatherName: "Rajesh Sharma",
    motherName: "Sunita Sharma",
    fatherPhone: "+91 98765 11111",
    motherPhone: "+91 98765 22222",
    personalPhone: "+91 98765 43210",
    siblings: "Anjali Sharma (Class 8)",
    email: "siddharth.sharma@example.com",
    religion: "Hinduism",
    dob: "15 May, 2008",
    address: "123, Sunshine Apartments, New Delhi, India",
    transport: "School Transport",
    subjects: ["Mathematics", "Physics", "Chemistry", "Computer Science", "English", "Physical Education"],
  };

  return (
    <div className="w-full">
      <div className="bg-primary p-8 text-center text-primary-foreground">
        <Avatar className="h-28 w-28 mx-auto border-4 border-background shadow-lg">
          <AvatarImage src={student.avatarUrl} alt={student.name} data-ai-hint="student avatar" />
          <AvatarFallback>{student.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
        </Avatar>
        <h1 className="mt-4 text-2xl font-bold">{student.name}</h1>
        <p className="text-primary-foreground/80">Class {student.class}-{student.section} | SRN: {student.srNumber}</p>
      </div>
      
      <div className="px-4 py-8 space-y-8">
        <Card className="shadow-none border-0">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <DetailItem icon={<Calendar size={20} />} label="Date of Birth" value={student.dob} />
            <DetailItem icon={<Heart size={20} />} label="Religion" value={student.religion} />
            <DetailItem icon={<Mail size={20} />} label="Email Address" value={student.email} />
            <DetailItem icon={<Phone size={20} />} label="Personal Phone" value={student.personalPhone} />
          </CardContent>
        </Card>

        <Card className="shadow-none border-0">
          <CardHeader>
            <CardTitle>Family Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <DetailItem icon={<User size={20} />} label="Father's Name" value={student.fatherName} />
            <DetailItem icon={<Phone size={20} />} label="Father's Phone" value={student.fatherPhone} />
            <DetailItem icon={<User size={20} />} label="Mother's Name" value={student.motherName} />
            <DetailItem icon={<Phone size={20} />} label="Mother's Phone" value={student.motherPhone} />
             <DetailItem icon={<Users size={20} />} label="Siblings" value={student.siblings} />
          </CardContent>
        </Card>

        <Card className="shadow-none border-0">
          <CardHeader>
            <CardTitle>School & Academic Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <DetailItem icon={<Bus size={20} />} label="Transport" value={student.transport} />
            <DetailItem icon={<Home size={20} />} label="Address" value={student.address} />
            <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground mb-2">Opted Subjects</p>
                <div className="flex flex-wrap gap-2">
                    {student.subjects.map((subject) => (
                        <Badge key={subject} variant="secondary">{subject}</Badge>
                    ))}
                </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
