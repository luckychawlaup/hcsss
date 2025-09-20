
"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "@/components/dashboard/Header";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent
} from "@/components/ui/card";
import { getAuth, User, onAuthStateChanged } from "firebase/auth";
import { app } from "@/lib/firebase";
import { getTeacherByAuthId, Teacher } from "@/lib/firebase/teachers";
import { getStudentsForTeacher, Student } from "@/lib/firebase/students";
import { getLeaveRequestsForClassTeacher, LeaveRequest } from "@/lib/firebase/leaves";
import { Skeleton } from "../ui/skeleton";
import { Users, ClipboardCheck, CalendarCheck, BookUp, ArrowLeft, Megaphone, CalendarPlus, Camera, BookMarked } from "lucide-react";
import { StatCard } from "@/components/principal/StatCard";
import dynamic from "next/dynamic";
import TeacherNav from "./TeacherNav";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import { TeacherLeave } from "./TeacherLeave";

const TeacherStudentList = dynamic(() => import('./TeacherStudentList'), {
  loading: () => <Skeleton className="h-64 w-full" />,
});
const ApproveLeaves = dynamic(() => import('../teacher/ApproveLeaves'), {
  loading: () => <Skeleton className="h-48 w-full" />,
});
const AddHomeworkForm = dynamic(() => import('./AddHomeworkForm'), {
  loading: () => <Skeleton className="h-96 w-full" />,
});
const MarkAttendance = dynamic(() => import('./MarkAttendance'), {
  loading: () => <Skeleton className="h-96 w-full" />,
});


export type TeacherView = "dashboard" | "manageStudents" | "approveLeaves" | "addHomework" | "markAttendance" | "makeAnnouncement" | "teacherLeave" | "gradebook";

const NavCard = ({ title, description, icon: Icon, onClick }: { title: string, description: string, icon: React.ElementType, onClick: () => void }) => (
    <Card className="hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer" onClick={onClick}>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-6 w-6" />
            </div>
            <div>
                <h3 className="font-semibold text-base">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
        </CardHeader>
    </Card>
);

export default function TeacherDashboard() {
  const [activeView, setActiveView] = useState<TeacherView>("dashboard");
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [assignedStudents, setAssignedStudents] = useState<Student[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const auth = getAuth(app);
  const router = useRouter();


  useEffect(() => {
    setIsLoading(true);
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const teacherProfile = await getTeacherByAuthId(user.uid);
        setTeacher(teacherProfile);
        if (!teacherProfile) {
            setIsLoading(false);
        }
      } else {
        setTeacher(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [auth]);

  useEffect(() => {
    if (teacher) {
      const unsubscribeStudents = getStudentsForTeacher(teacher, (students) => {
        setAssignedStudents(students);
        setIsLoading(false); // Stop loading once students are fetched
      });
      
      // If the teacher is a class teacher, fetch leave requests for their class
      if (teacher.role === 'classTeacher') {
          const unsubscribeLeaves = getLeaveRequestsForClassTeacher(teacher.id, setLeaves);
          return () => {
              unsubscribeStudents();
              unsubscribeLeaves();
          };
      }

       return () => unsubscribeStudents();
    }
  }, [teacher]);


  const pendingLeavesCount = leaves.filter(l => l.status === 'Pending').length;
  const classTeacherStudentsCount = useMemo(() => {
    if (teacher?.role !== 'classTeacher' || !teacher.classTeacherOf) return 0;
    return assignedStudents.filter(s => `${s.class}-${s.section}` === teacher.classTeacherOf).length;
  }, [teacher, assignedStudents]);


   const renderContent = () => {
        switch(activeView) {
            case 'manageStudents':
                return (
                     <Card>
                        <CardHeader>
                            <Button variant="ghost" onClick={() => setActiveView('dashboard')} className="justify-start p-0 h-auto mb-4 text-primary md:hidden">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Dashboard
                            </Button>
                            <CardTitle className="flex items-center gap-2">
                                <Users />
                                My Students
                            </CardTitle>
                            <CardDescription>
                                View and manage student details for your classes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             <TeacherStudentList students={assignedStudents} isLoading={isLoading} />
                        </CardContent>
                    </Card>
                );
            case 'approveLeaves':
                return (
                    <Card>
                        <CardHeader>
                            <Button variant="ghost" onClick={() => setActiveView('dashboard')} className="justify-start p-0 h-auto mb-4 text-primary md:hidden">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Dashboard
                            </Button>
                             <CardTitle className="flex items-center gap-2">
                                <CalendarCheck />
                                Approve Student Leaves
                            </CardTitle>
                             <CardDescription>
                                Review and approve or reject leave applications from your students.
                            </CardDescription>
                        </CardHeader>
                         <CardContent>
                            {teacher?.role !== 'classTeacher' ? (
                                <div className="text-center text-muted-foreground p-8 border border-dashed rounded-md">
                                    <p>Leave approval is only available for Class Teachers.</p>
                                </div>
                            ) : (
                                <ApproveLeaves leaves={leaves} title="your students" />
                            )}
                        </CardContent>
                    </Card>
                );
            case 'addHomework':
                return (
                    <Card>
                        <CardHeader>
                            <Button variant="ghost" onClick={() => setActiveView('dashboard')} className="justify-start p-0 h-auto mb-4 text-primary md:hidden">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Dashboard
                            </Button>
                             <CardTitle className="flex items-center gap-2">
                                <BookUp />
                                Assign Homework
                            </CardTitle>
                             <CardDescription>
                                Create and assign homework to your classes. You can also add attachments.
                            </CardDescription>
                        </CardHeader>
                         <CardContent>
                            <AddHomeworkForm teacher={teacher} />
                        </CardContent>
                    </Card>
                );
            case 'markAttendance':
                 return (
                    <Card>
                        <CardHeader>
                            <Button variant="ghost" onClick={() => setActiveView('dashboard')} className="justify-start p-0 h-auto mb-4 text-primary md:hidden">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Dashboard
                            </Button>
                             <CardTitle className="flex items-center gap-2">
                                <ClipboardCheck />
                                Mark Student Attendance
                            </CardTitle>
                             <CardDescription>
                                Mark daily attendance for your assigned classes.
                            </CardDescription>
                        </CardHeader>
                         <CardContent>
                            <MarkAttendance teacher={teacher} students={assignedStudents} isLoading={isLoading} />
                        </CardContent>
                    </Card>
                );
            case 'teacherLeave':
                return (
                    <Card>
                        <CardHeader>
                            <Button variant="ghost" onClick={() => setActiveView('dashboard')} className="justify-start p-0 h-auto mb-4 text-primary md:hidden">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Dashboard
                            </Button>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarPlus />
                                Leave Application
                            </CardTitle>
                            <CardDescription>
                                Apply for your own leave and track its status.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TeacherLeave teacher={teacher} />
                        </CardContent>
                    </Card>
                );
             case 'gradebook':
                return (
                    <Card>
                        <CardHeader>
                            <Button variant="ghost" onClick={() => setActiveView('dashboard')} className="justify-start p-0 h-auto mb-4 text-primary md:hidden">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Dashboard
                            </Button>
                            <CardTitle className="flex items-center gap-2">
                                <BookMarked />
                                Gradebook & Assessments
                            </CardTitle>
                            <CardDescription>
                                Manage student grades, assessments, and performance.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
                                <h3 className="mt-4 text-lg font-semibold">Feature Coming Soon</h3>
                                <p className="text-muted-foreground mt-2">The Gradebook & Assessment Tool is currently under development.</p>
                            </div>
                        </CardContent>
                    </Card>
                );
            default:
                return (
                    <div className="space-y-6">
                        <div className="mx-auto grid w-full grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
                           {teacher?.role === 'classTeacher' && (
                                <div className="cursor-pointer" onClick={() => setActiveView("manageStudents")}>
                                    <StatCard title="Total Students" value={isLoading ? '...' : classTeacherStudentsCount.toString()} icon={Users} />
                                </div>
                            )}
                             {teacher?.role === 'classTeacher' && (
                                <div className="cursor-pointer" onClick={() => setActiveView("approveLeaves")}>
                                    <StatCard title="Pending Leaves" value={isLoading ? '...' : pendingLeavesCount.toString()} icon={CalendarCheck} />
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <NavCard title="Announcements" description="Send announcements to classes" icon={Megaphone} onClick={() => router.push('/teacher/announcements')} />
                           <NavCard title="School Gallery" description="View and manage school photos" icon={Camera} onClick={() => router.push('/gallery')} />
                           <NavCard title="Gradebook & Assessments" description="Manage student grades and performance" icon={BookMarked} onClick={() => setActiveView("gradebook")} />
                        </div>
                    </div>
                );
        }
   };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background md:flex-row">
      <TeacherNav activeView={activeView} setActiveView={setActiveView} />
      <div className="flex flex-1 flex-col">
        <Header title="Teacher Dashboard" showAvatar={true} />
        <main className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
            <div className="mx-auto w-full max-w-6xl">
            {renderContent()}
            </div>
        </main>
      </div>
    </div>
  );
}
