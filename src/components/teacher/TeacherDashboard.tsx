
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
import { Users, ClipboardCheck, CalendarCheck } from "lucide-react";
import { StatCard } from "@/components/principal/StatCard";
import { getAuth, User } from "firebase/auth";
import { app } from "@/lib/firebase";
import { getTeacherByAuthId, Teacher } from "@/lib/firebase/teachers";
import { getStudents, Student } from "@/lib/firebase/students";
import TeacherStudentList from "./TeacherStudentList";
import ApproveLeaves from "./ApproveLeaves";

export default function TeacherDashboard() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const auth = getAuth(app);

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
            if (teacher.role === 'classTeacher') {
                return `${student.class}-${student.section}` === teacher.classTeacherOf;
            }
            if (teacher.role === 'subjectTeacher' && teacher.classesTaught) {
                return teacher.classesTaught.includes(`${student.class}-${student.section}`);
            }
            return false;
        });
        setStudents(assignedStudents);
        setIsLoading(false);
      });
       return () => unsubscribeStudents();
    } else {
        setIsLoading(false);
    }
  }, [teacher]);


  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header title="Teacher Dashboard" showAvatar={true} />
      <main className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8">
        
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Your Students" value={isLoading ? '...' : students.length.toString()} icon={Users} />
            <StatCard title="Class Teacher" value={teacher?.role === 'classTeacher' ? (teacher.classTeacherOf || 'N/A') : 'N/A'} icon={Users} />
            <StatCard title="Pending Leaves" value="2" icon={CalendarCheck} />
            <StatCard title="Assignments Due" value="3" icon={ClipboardCheck} />
        </div>

        <div className="mx-auto w-full max-w-6xl">
            <Tabs defaultValue="manageStudents">
                 <TabsList className="grid w-full grid-cols-3 md:w-1/2 lg:w-1/2">
                    <TabsTrigger value="manageStudents">Manage Students</TabsTrigger>
                    <TabsTrigger value="approveLeaves">Approve Leaves</TabsTrigger>
                    <TabsTrigger value="markAttendance">Mark Attendance</TabsTrigger>
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
                            <ApproveLeaves students={students} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="markAttendance">
                    <Card className="mt-4">
                        <CardHeader>
                             <CardTitle className="flex items-center gap-2">
                                <ClipboardCheck />
                                Mark Attendance
                            </CardTitle>
                             <CardDescription>
                                Mark daily attendance for your classes.
                            </CardDescription>
                        </CardHeader>
                         <CardContent>
                            <p className="text-muted-foreground">The attendance marking module is coming soon.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
      </main>
    </div>
  );
}
