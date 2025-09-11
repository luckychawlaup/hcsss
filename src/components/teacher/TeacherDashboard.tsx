
"use client";

import { useState, useEffect } from "react";
import Header from "@/components/dashboard/Header";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent
} from "@/components/ui/card";
import { getAuth, User, sendPasswordResetEmail, onAuthStateChanged } from "firebase/auth";
import { app } from "@/lib/firebase";
import { getTeacherByAuthId, Teacher, updateTeacher } from "@/lib/firebase/teachers";
import { getStudents, Student } from "@/lib/firebase/students";
import { getLeaveRequestsForStudents, LeaveRequest } from "@/lib/firebase/leaves";
import { Alert, AlertTitle, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "../ui/skeleton";
import { Users, ClipboardCheck, CalendarCheck, BookUp, DollarSign, CalendarPlus, AlertCircle, Loader2, ArrowLeft, LifeBuoy, MessageSquareQuote } from "lucide-react";
import { StatCard } from "@/components/principal/StatCard";
import dynamic from "next/dynamic";
import TeacherNav from "./TeacherNav";

const TeacherStudentList = dynamic(() => import('./TeacherStudentList'), {
  loading: () => <Skeleton className="h-64 w-full" />,
});
const ApproveLeaves = dynamic(() => import('./ApproveLeaves'), {
  loading: () => <Skeleton className="h-48 w-full" />,
});
const AddHomeworkForm = dynamic(() => import('./AddHomeworkForm').then(mod => mod.AddHomeworkForm), {
  loading: () => <Skeleton className="h-96 w-full" />,
});
const MarkAttendance = dynamic(() => import('./MarkAttendance').then(mod => mod.MarkAttendance), {
  loading: () => <Skeleton className="h-96 w-full" />,
});
const TeacherLeave = dynamic(() => import('./TeacherLeave').then(mod => mod.TeacherLeave), {
  loading: () => <Skeleton className="h-96 w-full" />,
});

export type TeacherView = "dashboard" | "manageStudents" | "approveLeaves" | "addHomework" | "markAttendance" | "applyLeave";

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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResending, setIsResending] = useState(false);
  const auth = getAuth(app);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true);
      if (user) {
        setCurrentUser(user);
        const teacherProfile = await getTeacherByAuthId(user.uid);
        setTeacher(teacherProfile);
      } else {
        setCurrentUser(null);
        setTeacher(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [auth]);

  useEffect(() => {
    if (teacher) {
      const unsubscribeStudents = getStudents((students) => {
        setAllStudents(students);
        
        const assignedStudentIds = students.filter(student => {
            const classSection = `${student.class}-${student.section}`;
            const isClassTeacher = teacher.role === 'classTeacher' && classSection === teacher.classTeacherOf;
            const isSubjectTeacher = teacher.role === 'subjectTeacher' && teacher.classesTaught?.includes(classSection);
            return isClassTeacher || isSubjectTeacher;
        }).map(s => s.id);
        
        if (assignedStudentIds.length > 0) {
            const unsubscribeLeaves = getLeaveRequestsForStudents(assignedStudentIds, setLeaves);
            return () => unsubscribeLeaves();
        } else {
            setLeaves([]);
        }
        
        setIsLoading(false);
      });
       return () => unsubscribeStudents();
    } else if (!isLoading && !currentUser) {
        setIsLoading(false);
    }
  }, [teacher, currentUser, isLoading]);

  const handleResendEmail = async () => {
    if (!currentUser?.email) return;
    setIsResending(true);
    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      if(teacher) {
          await updateTeacher(teacher.id, { mustChangePassword: false, tempPassword: "" });
      }
      toast({
        title: "Password Reset Email Sent",
        description: "Please check your inbox to set a new password.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send password reset email. Please try again.",
      });
    } finally {
      setIsResending(false);
    }
  }

  const pendingLeavesCount = leaves.filter(l => l.status === 'Pending').length;

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
                             <TeacherStudentList students={allStudents} isLoading={isLoading} />
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
                            {isLoading ? <Skeleton className="h-48 w-full" /> : <ApproveLeaves leaves={leaves} title="your students" />}
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
                            <MarkAttendance teacher={teacher} students={allStudents} isLoading={isLoading} />
                        </CardContent>
                    </Card>
                );
            case 'applyLeave':
                return (
                    <Card>
                        <CardHeader>
                            <Button variant="ghost" onClick={() => setActiveView('dashboard')} className="justify-start p-0 h-auto mb-4 text-primary md:hidden">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Dashboard
                            </Button>
                             <CardTitle className="flex items-center gap-2">
                                <CalendarPlus />
                                Apply for Your Leave
                            </CardTitle>
                             <CardDescription>
                                Submit your own leave requests and view your leave history.
                            </CardDescription>
                        </CardHeader>
                         <CardContent>
                           <TeacherLeave teacher={teacher} />
                        </CardContent>
                    </Card>
                );
            default:
                return (
                    <div className="space-y-6">
                        <div className="mx-auto grid w-full grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
                            <StatCard title="Total Students" value={isLoading ? '...' : allStudents.length.toString()} icon={Users} />
                            <StatCard title="Class Teacher Of" value={teacher?.role === 'classTeacher' ? (teacher.classTeacherOf || 'N/A') : 'N/A'} icon={Users} />
                            <StatCard title="Pending Leaves" value={isLoading ? '...' : pendingLeavesCount.toString()} icon={CalendarCheck} />
                            <StatCard title="Assignments Due" value="3" icon={ClipboardCheck} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <NavCard title="My Students" description="View and manage student details" icon={Users} onClick={() => setActiveView("manageStudents")} />
                            <NavCard title="Approve Leaves" description="Review student leave requests" icon={CalendarCheck} onClick={() => setActiveView("approveLeaves")} />
                            <NavCard title="Apply for Leave" description="Request your own personal leave" icon={CalendarPlus} onClick={() => setActiveView("applyLeave")} />
                             <NavCard title="Feedback" description="Submit complaints or suggestions" icon={MessageSquareQuote} onClick={() => { window.location.href = '/feedback'; }} />
                            <NavCard title="Help & Support" description="Find answers to your questions" icon={LifeBuoy} onClick={() => { window.location.href = '/help'; }} />
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
            
            {teacher?.mustChangePassword && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Action Required: Change Your Password</AlertTitle>
                    <AlertDescription>
                    You are currently logged in with a temporary password. For your security, please change it immediately. A password reset email was sent to your email.
                    <Button onClick={handleResendEmail} disabled={isResending} variant="link" className="p-0 h-auto ml-2 text-destructive-foreground underline">
                            {isResending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Resend Password Reset Email
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            <div className="mx-auto w-full max-w-6xl">
            {renderContent()}
            </div>
        </main>
      </div>
    </div>
  );
}
