
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
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { getTeacherByAuthId, Teacher } from "@/lib/supabase/teachers";
import { getStudentsForTeacher, CombinedStudent, updateStudent, Student } from "@/lib/supabase/students";
import { getFeedbackForClassTeacher, Feedback } from "@/lib/supabase/feedback";
import { getLeaveRequestsForClassTeacher, LeaveRequest } from "@/lib/supabase/leaves";
import { Skeleton } from "../ui/skeleton";
import { Users, ClipboardCheck, CalendarCheck, BookUp, ArrowLeft, Megaphone, CalendarPlus, Camera, BookMarked, UserCheck as UserCheckIcon, Book, CalendarDays, CalendarOff, ChevronRight } from "lucide-react";
import { StatCard } from "@/components/principal/StatCard";
import TeacherNav from "./TeacherNav";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import { TeacherLeave } from "./TeacherLeave";
import TeacherStudentList from './TeacherStudentList';
import ApproveLeaves from '../teacher/ApproveLeaves';
import AddHomeworkForm from './AddHomeworkForm';
import Gradebook from './Gradebook';
import MarkAttendance from './MarkAttendance';
import ManageHolidays from "../principal/ManageHolidays";
import { useIsMobile } from "@/hooks/use-mobile";
import Link from "next/link";
import DatesheetManager from "./DatesheetManager";
import SchoolStatus from "../dashboard/SchoolStatus";
import { getRole } from "@/lib/getRole";


export type TeacherView = "dashboard" | "manageStudents" | "approveFeedback" | "addHomework" | "makeAnnouncement" | "teacherLeave" | "gradebook" | "markAttendance" | "reviewLeaves" | "manageDatesheet" | "manageHolidays";

const NavCard = ({ title, description, icon: Icon, onClick, asLink, href }: { title: string, description: string, icon: React.ElementType, onClick?: () => void, asLink?: boolean, href?: string }) => {
    const content = (
         <Card 
            className="group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full"
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
                 <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-base">{title}</h3>
                        <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardHeader>
        </Card>
    );

    if (asLink && href) {
        return <Link href={href} target="_blank" rel="noopener noreferrer" className="block h-full" onClick={onClick}>{content}</Link>
    }

    return <div onClick={onClick} className="h-full">{content}</div>
};

export default function TeacherDashboard() {
  const [activeView, setActiveView] = useState<TeacherView>("dashboard");
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [assignedStudents, setAssignedStudents] = useState<CombinedStudent[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();
  const isMobile = useIsMobile();


  useEffect(() => {
    setIsLoading(true);
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        const user = session?.user;
        if (user) {
            const role = await getRole(user);
            setUserRole(role);

            const teacherProfile = await getTeacherByAuthId(user.id);
            setTeacher(teacherProfile);
            if (!teacherProfile) {
                setIsLoading(false);
            }
        } else {
            setTeacher(null);
            setIsLoading(false);
        }
    });

    return () => authListener.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (teacher) {
      const unsubscribeStudents = getStudentsForTeacher(teacher, (students) => {
        setAssignedStudents(students);
        setIsLoading(false); // Stop loading once students are fetched
      });
      
      let unsubscribeFeedback: any;
      let unsubscribeLeaves: any;
      if (teacher.role === 'classTeacher' && teacher.class_teacher_of) {
          unsubscribeFeedback = getFeedbackForClassTeacher(teacher.class_teacher_of, setFeedback);
          unsubscribeLeaves = getLeaveRequestsForClassTeacher(teacher.class_teacher_of, setLeaveRequests);
      }

      return () => {
        if(unsubscribeStudents) unsubscribeStudents();
        if(unsubscribeFeedback) unsubscribeFeedback.unsubscribe();
        if(unsubscribeLeaves) unsubscribeLeaves.unsubscribe();
      }
    }
  }, [teacher]);

  const handleStudentUpdated = async (studentId: string, updatedData: Partial<Student>) => {
    await updateStudent(studentId, updatedData);
  };


  const classTeacherStudentsCount = useMemo(() => {
    if (teacher?.role !== 'classTeacher' || !teacher.class_teacher_of) return 0;
    return assignedStudents.filter(s => `${s.class}-${s.section}` === teacher.class_teacher_of).length;
  }, [teacher, assignedStudents]);
  
  const relevantFeedback = useMemo(() => {
    if (teacher?.role !== 'classTeacher') return [];
    const teacherCategories = ["General Issues", "Academic Concerns", "Student Record Issues", "Discipline & Behaviour"];
    return feedback.filter(f => teacherCategories.includes(f.category));
  }, [feedback, teacher]);
  
  const pendingFeedbackCount = useMemo(() => relevantFeedback.filter(l => l.status === 'Pending').length, [relevantFeedback]);
  const pendingLeavesCount = useMemo(() => leaveRequests.filter(l => l.status === 'Pending').length, [leaveRequests]);

  const isPrincipal = userRole === 'principal' || userRole === 'owner';

   const renderContent = () => {
        switch(activeView) {
            case 'manageStudents':
                return (
                     <Card>
                        <CardHeader>
                            <Button variant="ghost" onClick={() => setActiveView('dashboard')} className="justify-start p-0 h-auto mb-4 text-primary">
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
                             <TeacherStudentList 
                                students={assignedStudents} 
                                isLoading={isLoading} 
                                isClassTeacher={teacher?.role === 'classTeacher'} 
                                onUpdateStudent={handleStudentUpdated}
                             />
                        </CardContent>
                    </Card>
                );
            case 'approveFeedback':
                return (
                    <Card>
                        <CardHeader>
                            <Button variant="ghost" onClick={() => setActiveView('dashboard')} className="justify-start p-0 h-auto mb-4 text-primary">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Dashboard
                            </Button>
                             <CardTitle className="flex items-center gap-2">
                                <ClipboardCheck />
                                Approve Student Feedback
                            </CardTitle>
                             <CardDescription>
                                Review and act on feedback and complaints from your students.
                            </CardDescription>
                        </CardHeader>
                         <CardContent>
                            {teacher?.role !== 'classTeacher' ? (
                                <div className="text-center text-muted-foreground p-8 border border-dashed rounded-md">
                                    <p>Complaint review is only available for Class Teachers.</p>
                                </div>
                            ) : (
                                <ApproveLeaves leaves={relevantFeedback as any} title="your students" />
                            )}
                        </CardContent>
                    </Card>
                );
            case 'reviewLeaves':
                 return (
                    <Card>
                        <CardHeader>
                            <Button variant="ghost" onClick={() => setActiveView('dashboard')} className="justify-start p-0 h-auto mb-4 text-primary">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Dashboard
                            </Button>
                             <CardTitle className="flex items-center gap-2">
                                <CalendarCheck />
                                Review Student Leave Requests
                            </CardTitle>
                             <CardDescription>
                                Approve or reject leave requests from your students.
                            </CardDescription>
                        </CardHeader>
                         <CardContent>
                            {teacher?.role !== 'classTeacher' ? (
                                <div className="text-center text-muted-foreground p-8 border border-dashed rounded-md">
                                    <p>Leave approval is only available for Class Teachers.</p>
                                </div>
                            ) : (
                                <ApproveLeaves leaves={leaveRequests as any} title="your students" />
                            )}
                        </CardContent>
                    </Card>
                );
            case 'addHomework':
                return (
                    <Card>
                        <CardHeader>
                            <Button variant="ghost" onClick={() => setActiveView('dashboard')} className="justify-start p-0 h-auto mb-4 text-primary">
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
            case 'teacherLeave':
                return (
                    <Card>
                        <CardHeader>
                            <Button variant="ghost" onClick={() => setActiveView('dashboard')} className="justify-start p-0 h-auto mb-4 text-primary">
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
                            <TeacherLeave />
                        </CardContent>
                    </Card>
                );
             case 'gradebook':
                return (
                    <Card>
                        <CardHeader>
                            <Button variant="ghost" onClick={() => setActiveView('dashboard')} className="justify-start p-0 h-auto mb-4 text-primary">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Dashboard
                            </Button>
                            <CardTitle className="flex items-center gap-2">
                                <BookMarked />
                                Gradebook
                            </CardTitle>
                            <CardDescription>
                                Enter student grades for different exams and assessments.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Gradebook teacher={teacher} students={assignedStudents.filter(s => s.status === 'Registered') as Student[]} />
                        </CardContent>
                    </Card>
                );
            case 'markAttendance':
                return (
                    <Card>
                        <CardHeader>
                            <Button variant="ghost" onClick={() => setActiveView('dashboard')} className="justify-start p-0 h-auto mb-4 text-primary">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Dashboard
                            </Button>
                            <CardTitle className="flex items-center gap-2">
                                <UserCheckIcon />
                                Mark Attendance
                            </CardTitle>
                            <CardDescription>
                                Mark daily attendance for your class students.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                           <MarkAttendance teacher={teacher} students={assignedStudents.filter(s => s.status === 'Registered') as Student[]} />
                        </CardContent>
                    </Card>
                );
            case 'manageDatesheet':
                 return (
                    <Card>
                        <CardHeader>
                            <Button variant="ghost" onClick={() => setActiveView('dashboard')} className="justify-start p-0 h-auto mb-4 text-primary">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Dashboard
                            </Button>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarDays />
                                Manage Datesheet
                            </CardTitle>
                            <CardDescription>
                                Create new exams and set the datesheet for your class.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                           <DatesheetManager teacher={teacher} />
                        </CardContent>
                    </Card>
                );
             case 'manageHolidays':
                return (
                    <Card>
                        <CardHeader>
                            <Button variant="ghost" onClick={() => setActiveView('dashboard')} className="justify-start p-0 h-auto mb-4 text-primary">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Dashboard
                            </Button>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarOff />
                                Manage Holidays
                            </CardTitle>
                            <CardDescription>
                                Declare holidays for your class.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                           <ManageHolidays teacher={teacher} />
                        </CardContent>
                    </Card>
                );
            default:
                return (
                    <div className="space-y-6">
                        <SchoolStatus />
                        <div className="mx-auto grid w-full grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
                           {teacher?.role === 'classTeacher' && (
                                <>
                                <div className="cursor-pointer" onClick={() => setActiveView("manageStudents")}>
                                    <StatCard title="My Class Students" value={isLoading ? '...' : classTeacherStudentsCount.toString()} icon={Users} />
                                </div>
                                <div className="cursor-pointer" onClick={() => setActiveView("approveFeedback")}>
                                    <StatCard title="Pending Feedback" value={isLoading ? '...' : pendingFeedbackCount.toString()} icon={ClipboardCheck} />
                                </div>
                                 <div className="cursor-pointer" onClick={() => setActiveView("reviewLeaves")}>
                                    <StatCard title="Pending Leaves" value={isLoading ? '...' : pendingLeavesCount.toString()} icon={CalendarCheck} />
                                </div>
                                </>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {!isMobile && <NavCard title="Announcements" description="Send announcements to classes" icon={Megaphone} onClick={() => router.push('/teacher/announcements')} />}
                           <NavCard title="Assign Homework" description="Create and manage homework" icon={BookUp} onClick={() => setActiveView("addHomework")} />
                           <NavCard title="My Leave" description="Apply for your own leave" icon={CalendarPlus} onClick={() => setActiveView("teacherLeave")} />
                           <NavCard title="Online Textbooks" description="Access NCERT textbooks" icon={Book} asLink={true} href="https://ncert.nic.in/textbook.php" />
                           {teacher?.role === 'classTeacher' && (
                                <>
                                    <NavCard title="Review Feedback" description="Manage student feedback" icon={ClipboardCheck} onClick={() => setActiveView("approveFeedback")} />
                                    <NavCard title="Review Leaves" description="Approve student leave requests" icon={CalendarCheck} onClick={() => setActiveView("reviewLeaves")} />
                                    <NavCard title="Mark Attendance" description="Mark daily student attendance" icon={UserCheckIcon} onClick={() => setActiveView("markAttendance")} />
                                    <NavCard title="Manage Datesheet" description="Create exams and set schedules" icon={CalendarDays} onClick={() => setActiveView("manageDatesheet")} />
                                    <NavCard title="Gradebook" description="Manage student grades" icon={BookMarked} onClick={() => setActiveView("gradebook")} />
                                     <NavCard title="Declare Holiday" description="Declare a holiday for your class" icon={CalendarOff} onClick={() => setActiveView("manageHolidays")} />
                                </>
                           )}
                        </div>
                    </div>
                );
        }
   };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <TeacherNav activeView={activeView} setActiveView={setActiveView} teacherRole={teacher?.role} />
      <div className="flex flex-1 flex-col">
        <Header title="Teacher Dashboard" showAvatar={true} />
        <main className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8 pb-24">
            <div className="mx-auto w-full max-w-6xl">
            {renderContent()}
            </div>
        </main>
      </div>
    </div>
  );
}
