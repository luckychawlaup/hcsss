
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
  Info
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
             <div className="bg-card p-6 text-center border-b">
                <Skeleton className="h-24 w-24 mx-auto rounded-full border-4 border-background shadow-lg" />
                <Skeleton className="h-7 w-40 mt-4 mx-auto" />
                <Skeleton className="h-4 w-56 mt-2 mx-auto" />
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
             <div className="bg-card p-6 text-center border-b">
                <Avatar className="h-24 w-24 mx-auto border-4 border-background shadow-lg">
                    {student.photo_url ? (
                         <Image src={student.photo_url} alt={student.name} width={96} height={96} className="object-cover" />
                    ) : (
                        <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${student.name}`} alt={student.name} />
                    )}
                    <AvatarFallback>{student.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                </Avatar>
                <h1 className="mt-4 text-2xl font-bold">{student.name}</h1>
                <p className="text-muted-foreground">Class {student.class}-{student.section} | SRN: {student.srn}</p>
            </div>
        </div>
    )
}

export function TeacherProfile({ teacher }: { teacher: Teacher }) {
    const classAssignment = teacher.role === 'classTeacher' ? teacher.class_teacher_of : teacher.classes_taught?.join(', ');
    const roleLabel = teacher.role === 'classTeacher' ? 'Class Teacher Of' : 'Teaches Classes';

    return (
         <div className="w-full">
             <div className="bg-card p-6 text-center border-b">
                <Avatar className="h-24 w-24 mx-auto border-4 border-background shadow-lg">
                     {teacher.photo_url ? (
                         <Image src={teacher.photo_url} alt={teacher.name} width={96} height={96} className="object-cover" />
                    ) : (
                        <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${teacher.name}`} alt={teacher.name} />
                    )}
                    <AvatarFallback>{teacher.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                </Avatar>
                <h1 className="mt-4 text-2xl font-bold">{teacher.name}</h1>
                <p className="text-muted-foreground text-xs">Teacher ID: {teacher.auth_uid}</p>
                 {teacher.email && <p className="text-sm text-muted-foreground mt-1">{teacher.email}</p>}
            </div>
        </div>
    )
}
