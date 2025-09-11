
"use client";

import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged, User as AuthUser } from "firebase/auth";
import { app } from "@/lib/firebase";
import { getStudentByAuthId } from "@/lib/firebase/students";
import { getTeacherByAuthId } from "@/lib/firebase/teachers";
import type { Student } from "@/lib/firebase/students";
import type { Teacher } from "@/lib/firebase/teachers";
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
  Award,
  Book,
  Briefcase,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const DetailItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) => {
    if (!value) return null;
    return (
        <div className="flex items-start gap-4">
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

function ProfileSkeleton() {
    return (
        <div className="w-full">
             <div className="bg-primary p-8 text-center text-primary-foreground">
                <Skeleton className="h-28 w-28 mx-auto rounded-full border-4 border-background shadow-lg" />
                <Skeleton className="h-8 w-48 mt-4 mx-auto" />
                <Skeleton className="h-4 w-64 mt-2 mx-auto" />
            </div>
             <div className="px-4 py-8 space-y-8">
                <Card className="shadow-none border-0">
                    <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                    <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </CardContent>
                </Card>
             </div>
        </div>
    )
}

function StudentProfile({ student }: { student: Student }) {
    return (
        <div className="w-full">
             <div className="bg-primary p-8 text-center text-primary-foreground">
                <Avatar className="h-28 w-28 mx-auto border-4 border-background shadow-lg">
                    <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${student.name}`} alt={student.name} />
                    <AvatarFallback>{student.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                </Avatar>
                <h1 className="mt-4 text-2xl font-bold">{student.name}</h1>
                <p className="text-primary-foreground/80">Class {student.class}-{student.section} | SRN: {student.srn}</p>
            </div>
      
            <div className="px-4 py-8 space-y-8">
                <Card className="shadow-none border-0">
                <CardHeader><CardTitle>Family Information</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <DetailItem icon={<User size={20} />} label="Father's Name" value={student.fatherName} />
                    <DetailItem icon={<Phone size={20} />} label="Father's Phone" value={student.fatherPhone} />
                    <DetailItem icon={<User size={20} />} label="Mother's Name" value={student.motherName} />
                    <DetailItem icon={<Phone size={20} />} label="Mother's Phone" value={student.motherPhone} />
                    <DetailItem icon={<Phone size={20} />} label="Student's Phone" value={student.studentPhone} />
                </CardContent>
                </Card>

                <Card className="shadow-none border-0">
                <CardHeader><CardTitle>Contact &amp; Other Details</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                     <DetailItem icon={<Calendar size={20} />} label="Admission Date" value={new Date(student.admissionDate).toLocaleDateString("en-GB")} />
                    <DetailItem icon={<Home size={20} />} label="Address" value={student.address} />
                    <DetailItem icon={<Bus size={20} />} label="Transport" value={"School Transport"} />
                </CardContent>
                </Card>
            </div>
        </div>
    )
}

function TeacherProfile({ teacher }: { teacher: Teacher }) {
    const classAssignment = teacher.role === 'classTeacher' ? teacher.classTeacherOf : teacher.classesTaught?.join(', ');
    const roleLabel = teacher.role === 'classTeacher' ? 'Class Teacher Of' : 'Teaches Classes';

    return (
         <div className="w-full">
             <div className="bg-primary p-8 text-center text-primary-foreground">
                <Avatar className="h-28 w-28 mx-auto border-4 border-background shadow-lg">
                     <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${teacher.name}`} alt={teacher.name} />
                    <AvatarFallback>{teacher.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                </Avatar>
                <h1 className="mt-4 text-2xl font-bold">{teacher.name}</h1>
                <p className="text-primary-foreground/80 text-xs">Teacher ID: {teacher.id}</p>
                 {teacher.email && <p className="text-sm text-primary-foreground/80 mt-1">{teacher.email}</p>}
            </div>
      
            <div className="px-4 py-8 space-y-8">
                <Card className="shadow-none border-0">
                    <CardHeader><CardTitle>Professional Information</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <DetailItem icon={<Briefcase size={20} />} label="Role" value={teacher.role === 'classTeacher' ? 'Class Teacher' : 'Subject Teacher'} />
                        <DetailItem icon={<BookOpen size={20} />} label={roleLabel} value={classAssignment} />
                        <DetailItem icon={<Book size={20} />} label="Primary Subject" value={teacher.subject} />
                        <DetailItem icon={<Calendar size={20} />} label="Joining Date" value={new Date(teacher.joiningDate).toLocaleDateString("en-GB")} />
                    </CardContent>
                </Card>

                <Card className="shadow-none border-0">
                    <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <DetailItem icon={<Calendar size={20} />} label="Date of Birth" value={new Date(teacher.dob).toLocaleDateString("en-GB")} />
                        <DetailItem icon={<Phone size={20} />} label="Phone Number" value={teacher.phoneNumber} />
                        <DetailItem icon={<Home size={20} />} label="Address" value={teacher.address} />
                         {teacher.qualifications && teacher.qualifications.length > 0 && (
                            <div className="sm:col-span-2 flex items-start gap-4">
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

export default function ProfileDetails() {
  const [profile, setProfile] = useState<Student | Teacher | null>(null);
  const [role, setRole] = useState<"student" | "teacher" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: AuthUser | null) => {
        setIsLoading(true);
        if (user) {
            try {
                // Attempt to fetch teacher profile first
                const teacherProfile = await getTeacherByAuthId(user.uid);
                if (teacherProfile) {
                    setProfile(teacherProfile);
                    setRole('teacher');
                } else {
                    // If not a teacher, attempt to fetch student profile
                    const studentProfile = await getStudentByAuthId(user.uid);
                    if (studentProfile) {
                        setProfile(studentProfile);
                        setRole('student');
                    } else {
                        // If neither is found, set profile to null
                        setProfile(null);
                        setRole(null);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch profile:", error);
                setProfile(null);
                setRole(null);
            } finally {
                setIsLoading(false);
            }
        } else {
            setProfile(null);
            setRole(null);
            setIsLoading(false);
        }
    });

    return () => unsubscribe();
  }, [auth]);

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (!profile) {
    return (
        <div className="flex items-center justify-center h-96">
            <p>Could not load user profile. Please try again later.</p>
        </div>
    )
  }

  if (role === 'teacher') {
    return <TeacherProfile teacher={profile as Teacher} />;
  }
  
  if (role === 'student') {
    return <StudentProfile student={profile as Student} />;
  }

  return (
    <div className="flex items-center justify-center h-96">
        <p>Your profile could not be loaded. Please contact administration.</p>
    </div>
  )
}

    