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
  School,
  Calendar,
  Heart,
  Home,
  Bus,
} from "lucide-react";

const DetailItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | string[] }) => (
  <div className="flex items-start gap-4">
    <div className="text-muted-foreground mt-1">{icon}</div>
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      {Array.isArray(value) ? (
        <div className="flex flex-wrap gap-2 mt-1">
          {value.map((item, index) => (
            <span key={index} className="bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full">
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="font-medium">{value}</p>
      )}
    </div>
  </div>
);

export default function ProfileDetails() {
  const student = {
    name: "Siddharth Sharma",
    class: "10",
    section: "A",
    avatarUrl: "https://picsum.photos/200/200",
    fatherName: "Rajesh Sharma",
    motherName: "Sunita Sharma",
    fatherPhone: "+91 98765 11111",
    motherPhone: "+91 98765 22222",
    personalPhone: "+91 98765 43210",
    siblings: "1 (Anjali Sharma, Class 8)",
    email: "siddharth.sharma@example.com",
    religion: "Hinduism",
    dob: "2008-05-15",
    address: "123, Sunshine Apartments, New Delhi, India",
    transport: "School Transport",
    subjects: ["Mathematics", "Physics", "Chemistry", "Computer Science", "English", "Physical Education"],
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-primary/5 p-0">
        <div className="flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:text-left">
          <Avatar className="h-24 w-24 border-4 border-background">
            <AvatarImage src={student.avatarUrl} alt={student.name} data-ai-hint="student avatar" />
            <AvatarFallback>{student.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-3xl font-bold">{student.name}</CardTitle>
            <p className="text-lg text-muted-foreground">
              Class {student.class} - Section {student.section}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-6">
            <h3 className="font-semibold text-lg text-primary">Personal Information</h3>
            <DetailItem icon={<User size={20} />} label="Student Name" value={student.name} />
            <DetailItem icon={<Calendar size={20} />} label="Date of Birth" value={student.dob} />
            <DetailItem icon={<Heart size={20} />} label="Religion" value={student.religion} />
            <DetailItem icon={<Mail size={20} />} label="Email Address" value={student.email} />
            <DetailItem icon={<Phone size={20} />} label="Personal Phone" value={student.personalPhone} />
          </div>
          <div className="space-y-6">
            <h3 className="font-semibold text-lg text-primary">Family Information</h3>
            <DetailItem icon={<User size={20} />} label="Father's Name" value={student.fatherName} />
            <DetailItem icon={<Phone size={20} />} label="Father's Phone" value={student.fatherPhone} />
            <DetailItem icon={<User size={20} />} label="Mother's Name" value={student.motherName} />
            <DetailItem icon={<Phone size={20} />} label="Mother's Phone" value={student.motherPhone} />
            <DetailItem icon={<Users size={20} />} label="Siblings" value={student.siblings} />
          </div>
          <div className="space-y-6">
            <h3 className="font-semibold text-lg text-primary">Academic & School Details</h3>
            <DetailItem icon={<Bus size={20} />} label="Transport" value={student.transport} />
            <DetailItem icon={<BookOpen size={20} />} label="Opted Subjects" value={student.subjects} />
            <DetailItem icon={<Home size={20} />} label="Address" value={student.address} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}