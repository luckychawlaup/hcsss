
"use client";

import type { Student } from "@/lib/supabase/students";
import type { Teacher } from "@/lib/supabase/teachers";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  User,
  Phone,
  Calendar,
  Home,
  Mail,
  Award,
  Book,
  Briefcase,
  BookOpen,
  Users,
  GraduationCap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";

const DetailItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null | string[] }) => {
    if (!value) return null;
    
    let displayValue: React.ReactNode = value;

    if (Array.isArray(value)) {
        displayValue = (
            <div className="flex flex-wrap gap-2">
                {value.map((item, index) => (
                    <Badge key={index} variant="secondary">{item}</Badge>
                ))}
            </div>
        );
    }

    return (
        <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            {icon}
            </div>
            <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <div className="font-semibold text-sm">{displayValue}</div>
            </div>
        </div>
    );
};

export function ProfileSkeleton() {
    return (
        <div className="w-full">
             <div className="bg-card p-6 text-center border-b">
                <Skeleton className="h-24 w-24 mx-auto rounded-full border-4 border-background shadow-lg" />
                <Skeleton className="h-7 w-40 mt-4 mx-auto" />
                <Skeleton className="h-4 w-56 mt-2 mx-auto" />
            </div>
        </div>
    )
}

function formatDate(dateString?: string | number): string {
    if(!dateString) return 'N/A';
    // Check if it's a timestamp (number) or a date string
    const date = typeof dateString === 'number' ? new Date(dateString) : new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString("en-GB", { day: 'numeric', month: 'long', year: 'numeric' });
}


export function StudentProfile({ student }: { student: Student }) {
    return (
        <div className="w-full">
             <div className="bg-card p-6 text-center border-b">
                <Avatar className="h-24 w-24 mx-auto border-4 border-background shadow-lg">
                    <AvatarImage src={student.photo_url || `https://api.dicebear.com/8.x/initials/svg?seed=${student.name}`} alt={student.name} />
                    <AvatarFallback>{student.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                </Avatar>
                <h1 className="mt-4 text-2xl font-bold">{student.name}</h1>
                <p className="text-muted-foreground">Class {student.class}-{student.section} | SRN: {student.srn}</p>
            </div>
        </div>
    )
}


export function StudentProfileDetails({ student }: { student: Student }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <DetailItem icon={<User />} label="Father's Name" value={student.father_name} />
                <DetailItem icon={<User />} label="Mother's Name" value={student.mother_name} />
                <DetailItem icon={<Mail />} label="Email Address" value={student.email} />
                <DetailItem icon={<Phone />} label="Father's Contact" value={student.father_phone} />
                <DetailItem icon={<Phone />} label="Mother's Contact" value={student.mother_phone} />
                <DetailItem icon={<Phone />} label="Student's Contact" value={student.student_phone} />
                <DetailItem icon={<Calendar />} label="Date of Birth" value={formatDate(student.date_of_birth)} />
                <DetailItem icon={<Calendar />} label="Admission Date" value={formatDate(student.admission_date)} />
                <DetailItem icon={<Home />} label="Address" value={student.address} />
            </CardContent>
        </Card>
    )
}

export function TeacherProfile({ teacher }: { teacher: Teacher }) {
    return (
         <div className="w-full">
             <div className="bg-card p-6 text-center border-b">
                <Avatar className="h-24 w-24 mx-auto border-4 border-background shadow-lg">
                    <AvatarImage src={teacher.photo_url || `https://api.dicebear.com/8.x/initials/svg?seed=${teacher.name}`} alt={teacher.name} />
                    <AvatarFallback>{teacher.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                </Avatar>
                <h1 className="mt-4 text-2xl font-bold">{teacher.name}</h1>
                <p className="text-muted-foreground text-xs">Teacher ID: {teacher.auth_uid.substring(0, 8).toUpperCase()}</p>
                 {teacher.email && <p className="text-sm text-muted-foreground mt-1">{teacher.email}</p>}
            </div>
        </div>
    )
}


export function TeacherProfileDetails({ teacher }: { teacher: Teacher }) {
    const classAssignment = teacher.role === 'classTeacher' ? teacher.class_teacher_of : teacher.classes_taught?.join(', ');
    const roleLabel = teacher.role === 'classTeacher' ? 'Class Teacher Of' : 'Teaches Classes';

    return (
        <>
        <Card>
            <CardHeader><CardTitle className="text-lg">Professional Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <DetailItem icon={<Briefcase />} label="Role" value={teacher.role === 'classTeacher' ? 'Class Teacher' : 'Subject Teacher'} />
                <DetailItem icon={<BookOpen />} label="Primary Subject" value={teacher.subject} />
                <DetailItem icon={<Users />} label={roleLabel} value={classAssignment} />
                <DetailItem icon={<GraduationCap />} label="Qualifications" value={teacher.qualifications} />
                <DetailItem icon={<Calendar />} label="Joining Date" value={formatDate(teacher.joining_date)} />
            </CardContent>
        </Card>
        
        <Card className="mt-4">
             <CardHeader><CardTitle className="text-lg">Personal Information</CardTitle></CardHeader>
             <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                 <DetailItem icon={<User />} label="Father's Name" value={teacher.father_name} />
                 <DetailItem icon={<User />} label="Mother's Name" value={teacher.mother_name} />
                 <DetailItem icon={<Phone />} label="Phone Number" value={teacher.phone_number} />
                 <DetailItem icon={<Calendar />} label="Date of Birth" value={formatDate(teacher.dob)} />
                 <DetailItem icon={<Home />} label="Address" value={teacher.address} />
             </CardContent>
        </Card>
        </>
    )
}
