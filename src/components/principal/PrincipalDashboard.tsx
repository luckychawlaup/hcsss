
"use client";

import { useState, useEffect } from "react";
import Header from "@/components/dashboard/Header";
import { AddTeacherForm } from "./AddTeacherForm";
import { TeacherList } from "./TeacherList";
import { MakeAnnouncementForm } from "./MakeAnnouncementForm";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Users, GraduationCap, Eye, Megaphone, CalendarCheck } from "lucide-react";
import { StatCard } from "./StatCard";
import type { Teacher } from "@/lib/firebase/teachers";
import type { Student } from "@/lib/firebase/students";
import { updateStudent, deleteStudent } from "@/lib/firebase/students";
import { updateTeacher, deleteTeacher } from "@/lib/firebase/teachers";
import { AddStudentForm } from "./AddStudentForm";
import { StudentList } from "./StudentList";
import ApproveLeaves from "../teacher/ApproveLeaves";
import type { LeaveRequest } from "@/lib/firebase/leaves";
import { getLeaveRequestsForStudents, getLeaveRequestsForTeachers } from "@/lib/firebase/leaves";
import { Skeleton } from "../ui/skeleton";

export default function PrincipalDashboard({ allStudents, allTeachers }: { allStudents: Student[], allTeachers: Teacher[]}) {
  const [manageTeachersTab, setManageTeachersTab] = useState("addTeacher");
  const [manageStudentsTab, setManageStudentsTab] = useState("addStudent");
  const [activeTab, setActiveTab] = useState("manageTeachers");
  const [studentLeaves, setStudentLeaves] = useState<LeaveRequest[]>([]);
  const [teacherLeaves, setTeacherLeaves] = useState<LeaveRequest[]>([]);
  const [isLoadingLeaves, setIsLoadingLeaves] = useState(true);

  useEffect(() => {
    setIsLoadingLeaves(true);
    let unsubStudents: (() => void) | undefined;
    let unsubTeachers: (() => void) | undefined;
    
    if (allStudents.length > 0) {
        const allStudentIds = allStudents.map((s) => s.id);
        unsubStudents = getLeaveRequestsForStudents(
          allStudentIds,
          (leaves) => {
            setStudentLeaves(leaves);
            setIsLoadingLeaves(false);
          }
        );
      } else {
        setStudentLeaves([]);
        setIsLoadingLeaves(false);
      }
      
      if (allTeachers.length > 0) {
         const allTeacherIds = allTeachers.map((t) => t.id);
         unsubTeachers = getLeaveRequestsForTeachers(allTeacherIds, (leaves) => {
            setTeacherLeaves(leaves);
         });
      } else {
        setTeacherLeaves([]);
      }

      return () => {
      if (unsubStudents) unsubStudents();
      if (unsubTeachers) unsubTeachers();
    };

  }, [allStudents, allTeachers]);


  const handleTeacherAdded = () => {
    setManageTeachersTab("viewTeachers");
  };

  const handleTeacherUpdated = async (teacherId: string, updatedData: Partial<Teacher>) => {
    await updateTeacher(teacherId, updatedData);
  };

  const handleTeacherDeleted = async (teacherId: string) => {
    await deleteTeacher(teacherId);
  };

  const handleStudentAdded = () => {
     setManageStudentsTab("viewStudents");
  };

  const handleStudentUpdated = async (studentId: string, updatedData: Partial<Student>) => {
    await updateStudent(studentId, updatedData);
  };
  
  const handleStudentDeleted = async (studentId: string) => {
      await deleteStudent(studentId);
  };

  const pendingStudentLeavesCount = studentLeaves.filter(l => l.status === 'Pending').length;
  const pendingTeacherLeavesCount = teacherLeaves.filter(l => l.status === 'Pending').length;
  const totalPendingLeaves = pendingStudentLeavesCount + pendingTeacherLeavesCount;


  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header title="Principal Dashboard" showAvatar={false} />
      <main className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8">
        
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Students" value={allStudents.length.toString()} icon={GraduationCap} />
          <StatCard title="Total Teachers" value={allTeachers.length.toString()} icon={Users} />
          <StatCard title="New Admissions" value="45" icon={UserPlus} />
          <StatCard title="Pending Leaves" value={totalPendingLeaves.toString()} icon={CalendarCheck} />
        </div>

        <div className="mx-auto w-full max-w-6xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="manageTeachers">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="manageTeachers">Manage Teachers</TabsTrigger>
              <TabsTrigger value="manageStudents">Manage Students</TabsTrigger>
              <TabsTrigger value="viewLeaves">View Leaves</TabsTrigger>
              <TabsTrigger value="makeAnnouncement">Announcements</TabsTrigger>
            </TabsList>
            
            <TabsContent value="manageTeachers">
                 <Card className="mt-4">
                    <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users />
                        Manage Teachers
                    </CardTitle>
                    <CardDescription>
                        Add new teachers or view and manage existing staff.
                    </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={manageTeachersTab} onValueChange={setManageTeachersTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="addTeacher">Add Teacher</TabsTrigger>
                                <TabsTrigger value="viewTeachers">View Teachers</TabsTrigger>
                            </TabsList>
                            <TabsContent value="addTeacher">
                                <CardHeader className="px-1 pt-6">
                                     <CardTitle className="flex items-center gap-2 text-xl">
                                        <UserPlus />
                                        Register New Teacher
                                    </CardTitle>
                                    <CardDescription>
                                       Fill out the form below to register a new teacher. A unique registration key will be generated for them to create their account.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="px-1">
                                    <AddTeacherForm onTeacherAdded={handleTeacherAdded} />
                                </CardContent>
                            </TabsContent>
                            <TabsContent value="viewTeachers">
                                <CardHeader className="px-1 pt-6">
                                    <CardTitle className="flex items-center gap-2 text-xl">
                                        <Eye />
                                        View All Teachers
                                    </CardTitle>
                                    <CardDescription>
                                        Here is a list of all teachers currently in the system.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="px-1">
                                    <TeacherList 
                                        teachers={allTeachers} 
                                        isLoading={false}
                                        onUpdateTeacher={handleTeacherUpdated}
                                        onDeleteTeacher={handleTeacherDeleted}
                                    />
                                </CardContent>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </TabsContent>
            
            <TabsContent value="manageStudents">
              <Card className="mt-4">
                 <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap />
                    Manage Students
                  </CardTitle>
                  <CardDescription>
                    Add new students or view and manage existing student records.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                   <Tabs value={manageStudentsTab} onValueChange={setManageStudentsTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="addStudent">Add Student</TabsTrigger>
                            <TabsTrigger value="viewStudents">View Students</TabsTrigger>
                        </TabsList>
                        <TabsContent value="addStudent">
                           <CardHeader className="px-1 pt-6">
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <UserPlus />
                                    Add New Student
                                </CardTitle>
                                <CardDescription>
                                    Fill out the form to admit a new student. A unique Student Registration Number (SRN) will be generated.
                                </CardDescription>
                            </CardHeader>
                             <CardContent className="px-1">
                                <AddStudentForm onStudentAdded={handleStudentAdded} />
                            </CardContent>
                        </TabsContent>
                        <TabsContent value="viewStudents">
                             <CardHeader className="px-1 pt-6">
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <Eye />
                                    View All Students
                                </CardTitle>
                                <CardDescription>
                                    Here is a list of all students currently enrolled.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-1">
                               <StudentList
                                    students={allStudents}
                                    isLoading={false}
                                    onUpdateStudent={handleStudentUpdated}
                                    onDeleteStudent={handleStudentDeleted}
                                />
                            </CardContent>
                        </TabsContent>
                   </Tabs>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="viewLeaves">
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarCheck />
                    Review Leave Applications
                  </CardTitle>
                  <CardDescription>
                    Review and approve or reject leave applications from all students and teachers.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingLeaves ? <Skeleton className="h-48 w-full" /> : (
                        <Tabs defaultValue="students">
                            <TabsList>
                                <TabsTrigger value="students">Student Leaves ({pendingStudentLeavesCount})</TabsTrigger>
                                <TabsTrigger value="teachers">Teacher Leaves ({pendingTeacherLeavesCount})</TabsTrigger>
                            </TabsList>
                            <TabsContent value="students" className="mt-4">
                                <ApproveLeaves leaves={studentLeaves} title="Students" />
                            </TabsContent>
                            <TabsContent value="teachers" className="mt-4">
                                <ApproveLeaves leaves={teacherLeaves} title="Teachers" />
                            </TabsContent>
                        </Tabs>
                    )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="makeAnnouncement">
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone />
                    Make an Announcement
                  </CardTitle>
                  <CardDescription>
                    Publish an announcement to students, teachers, or both.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MakeAnnouncementForm />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
