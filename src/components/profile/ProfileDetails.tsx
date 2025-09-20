
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
  Bus,
  Award,
  Book,
  Briefcase,
  BookOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";

const DetailItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) => {
    if (!value) return null;
    return (
        <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-secondary/50 transition-colors">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            {icon}
            </div>
            <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-semibold text-sm">{value}</p>
            </div>
        </div>
    );
};

export function ProfileSkeleton() {
    return (
        <div className="w-full">
             <div className="bg-card p-6 text-center">
                <Skeleton className="h-24 w-24 mx-auto rounded-full border-4 border-background shadow-lg" />
                <Skeleton className="h-7 w-40 mt-4 mx-auto" />
                <Skeleton className="h-4 w-56 mt-2 mx-auto" />
            </div>
             <div className="px-2 py-4 md:px-4 md:py-6 space-y-4">
                <Card className="shadow-none border-0">
                    <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                    <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </CardContent>
                </Card>
             </div>
        </div>
    )
}

function formatDateFromTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString("en-GB");
}

export function StudentProfile({ student }: { student: Student }) {
    return (
        <div className="w-full">
             <div className="bg-card p-6 text-center">
                <Avatar className="h-24 w-24 mx-auto border-4 border-background shadow-lg">
                    {student.photoUrl ? (
                         <Image src={student.photoUrl} alt={student.name} width={96} height={96} className="object-cover" />
                    ) : (
                        <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${student.name}`} alt={student.name} />
                    )}
                    <AvatarFallback>{student.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                </Avatar>
                <h1 className="mt-4 text-2xl font-bold">{student.name}</h1>
                <p className="text-muted-foreground">Class {student.class}-{student.section} | SRN: {student.srn}</p>
            </div>
      
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <Card>
                    <CardHeader><CardTitle className="text-base font-semibold flex items-center gap-2"><User /> Family Information</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4">
                        <DetailItem icon={<User size={20} />} label="Father's Name" value={student.fatherName} />
                        <DetailItem icon={<Phone size={20} />} label="Father's Phone" value={student.fatherPhone} />
                        <DetailItem icon={<User size={20} />} label="Mother's Name" value={student.motherName} />
                        <DetailItem icon={<Phone size={20} />} label="Mother's Phone" value={student.motherPhone} />
                        <DetailItem icon={<Phone size={20} />} label="Student's Phone" value={student.studentPhone} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="text-base font-semibold flex items-center gap-2"><Home /> Contact &amp; Other Details</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4">
                        <DetailItem icon={<Calendar size={20} />} label="Admission Date" value={formatDateFromTimestamp(student.admissionDate)} />
                        <DetailItem icon={<Home size={20} />} label="Address" value={student.address} />
                        <DetailItem icon={<Bus size={20} />} label="Transport" value={"School Transport"} />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export function TeacherProfile({ teacher }: { teacher: Teacher }) {
    const classAssignment = teacher.role === 'classTeacher' ? teacher.classTeacherOf : teacher.classesTaught?.join(', ');
    const roleLabel = teacher.role === 'classTeacher' ? 'Class Teacher Of' : 'Teaches Classes';

    return (
         <div className="w-full">
             <div className="bg-card p-6 text-center">
                <Avatar className="h-24 w-24 mx-auto border-4 border-background shadow-lg">
                     {teacher.photoUrl ? (
                         <Image src={teacher.photoUrl} alt={teacher.name} width={96} height={96} className="object-cover" />
                    ) : (
                        <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${teacher.name}`} alt={teacher.name} />
                    )}
                    <AvatarFallback>{teacher.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                </Avatar>
                <h1 className="mt-4 text-2xl font-bold">{teacher.name}</h1>
                <p className="text-muted-foreground text-xs">Teacher ID: {teacher.authUid}</p>
                 {teacher.email && <p className="text-sm text-muted-foreground mt-1">{teacher.email}</p>}
            </div>
      
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <Card>
                    <CardHeader><CardTitle className="text-base font-semibold flex items-center gap-2"><Briefcase /> Professional Information</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4">
                        <DetailItem icon={<Briefcase size={20} />} label="Role" value={teacher.role === 'classTeacher' ? 'Class Teacher' : 'Subject Teacher'} />
                        <DetailItem icon={<BookOpen size={20} />} label={roleLabel} value={classAssignment} />
                        <DetailItem icon={<Book size={20} />} label="Primary Subject" value={teacher.subject} />
                        <DetailItem icon={<Calendar size={20} />} label="Joining Date" value={formatDateFromTimestamp(teacher.joiningDate)} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="text-base font-semibold flex items-center gap-2"><User /> Personal Information</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4">
                        <DetailItem icon={<Calendar size={20} />} label="Date of Birth" value={new Date(teacher.dob).toLocaleDateString("en-GB")} />
                        <DetailItem icon={<Phone size={20} />} label="Phone Number" value={teacher.phoneNumber} />
                        <DetailItem icon={<Home size={20} />} label="Address" value={teacher.address} />
                         {teacher.qualifications && teacher.qualifications.length > 0 && (
                            <div className="sm:col-span-2 flex items-start gap-4 p-4 rounded-lg">
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    <Award size={20} />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Qualifications</p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {teacher.qualifications.map((q) => <Badge key={q} variant="secondary">{q}</Badge>)}
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

    