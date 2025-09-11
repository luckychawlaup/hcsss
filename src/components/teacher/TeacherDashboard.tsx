
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, ClipboardCheck, CalendarCheck, BookUp, DollarSign, Banknote, CalendarPlus, AlertCircle, Loader2 } from "lucide-react";
import { StatCard } from "@/components/principal/StatCard";
import { getAuth, User, sendPasswordResetEmail, onAuthStateChanged } from "firebase/auth";
import { app } from "@/lib/firebase";
import { getTeacherByAuthId, Teacher, updateTeacher } from "@/lib/firebase/teachers";
import { getStudents, Student } from "@/lib/firebase/students";
import TeacherStudentList from "./TeacherStudentList";
import ApproveLeaves from "./ApproveLeaves";
import { AddHomeworkForm } from "./AddHomeworkForm";
import { MarkAttendance } from "./MarkAttendance";
import { TeacherLeave } from "./TeacherLeave";
import { SalaryDetails } from "./SalaryDetails";
import { Alert, AlertTitle, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";


export default function TeacherDashboard() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResending, setIsResending] = useState(false);
  const auth = getAuth(app);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const teacherProfile = await getTeacherByAuthId(user.uid);
        setTeacher(teacherProfile);
      } else {
        setCurrentUser(null);
        setTeacher(null);
      }
    });

    return () => unsubscribeAuth();
  }, [auth]);

  useEffect(() => {
    if (teacher) {
      const unsubscribeStudents = getStudents((allStudents) => {
        const assignedStudents = allStudents.filter(student => {
            const classSection = `${student.class}-${student.section}`;
            const isClassTeacher = teacher.role === 'classTeacher' && classSection === teacher.classTeacherOf;
            const isSubjectTeacher = teacher.role === 'subjectTeacher' && teacher.classesTaught?.includes(classSection);
            return isClassTeacher || isSubjectTeacher;
        });
        setStudents(assignedStudents);
        setIsLoading(false);
      });
       return () => unsubscribeStudents();
    } else {
        setIsLoading(false);
    }
  }, [teacher]);

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


  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header title="Teacher Dashboard" showAvatar={true} />
      <main className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8">
        
        {teacher?.mustChangePassword && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Action Required: Change Your Password</AlertTitle>
                <AlertDescription>
                   You are currently logged in with a temporary password. For your security, please change it immediately. A password reset link was sent to your email.
                   <Button onClick={handleResendEmail} disabled={isResending} variant="link" className="p-0 h-auto ml-2 text-destructive-foreground underline">
                        {isResending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Resend Password Reset Email
                    </Button>
                </AlertDescription>
            </Alert>
        )}

        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Your Students" value={isLoading ? '...' : students.length.toString()} icon={Users} />
            <StatCard title="Class Teacher Of" value={teacher?.role === 'classTeacher' ? (teacher.classTeacherOf || 'N/A') : 'N/A'} icon={Users} />
            <StatCard title="Pending Leaves" value="2" icon={CalendarCheck} />
            <StatCard title="Assignments Due" value="3" icon={ClipboardCheck} />
        </div>

        <div className="mx-auto w-full max-w-6xl">
            <Tabs defaultValue="manageStudents">
                 <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 lg:grid-cols-6">
                    <TabsTrigger value="manageStudents">Students</TabsTrigger>
                    <TabsTrigger value="approveLeaves">Approve Leaves</TabsTrigger>
                    <TabsTrigger value="addHomework">Homework</TabsTrigger>
                    <TabsTrigger value="markAttendance">Attendance</TabsTrigger>
                    <TabsTrigger value="applyLeave">My Leave</TabsTrigger>
                    <TabsTrigger value="salary">Salary Details</TabsTrigger>
                </TabsList>

                <TabsContent value="manageStudents">
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users />
                                Manage Students
                            </CardTitle>
                            <CardDescription>
                                View and manage student details for your classes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             <TeacherStudentList students={students} isLoading={isLoading} />
                        </CardContent>
                    </Card>
                </TabsContent>

                 <TabsContent value="approveLeaves">
                    <Card className="mt-4">
                        <CardHeader>
                             <CardTitle className="flex items-center gap-2">
                                <CalendarCheck />
                                Approve Student Leaves
                            </CardTitle>
                             <CardDescription>
                                Review and approve or reject leave applications from your students.
                            </CardDescription>
                        </CardHeader>
                         <CardContent>
                            <ApproveLeaves assignedStudents={students} />
                        </CardContent>
                    </Card>
                </TabsContent>

                 <TabsContent value="addHomework">
                    <Card className="mt-4">
                        <CardHeader>
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
                </TabsContent>

                <TabsContent value="markAttendance">
                    <Card className="mt-4">
                        <CardHeader>
                             <CardTitle className="flex items-center gap-2">
                                <ClipboardCheck />
                                Mark Student Attendance
                            </CardTitle>
                             <CardDescription>
                                Mark daily attendance for your assigned classes.
                            </CardDescription>
                        </CardHeader>
                         <CardContent>
                            <MarkAttendance teacher={teacher} students={students} isLoading={isLoading} />
                        </CardContent>
                    </Card>
                </TabsContent>
                
                 <TabsContent value="applyLeave">
                    <Card className="mt-4">
                        <CardHeader>
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
                </TabsContent>

                 <TabsContent value="salary">
                    <Card className="mt-4">
                        <CardHeader>
                             <CardTitle className="flex items-center gap-2">
                                <DollarSign />
                                Salary & Bank Details
                            </CardTitle>
                             <CardDescription>
                                View your salary history and manage your bank account details.
                            </CardDescription>
                        </CardHeader>
                         <CardContent>
                            <SalaryDetails teacher={teacher} />
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>
        </div>
      </main>
    </div>
  );
}
