
"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "@/components/dashboard/Header";
import { User, onAuthStateChanged } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getTeachersAndPending, updateTeacher, deleteTeacher, Teacher } from "@/lib/supabase/teachers";
import { getStudentsAndPending, updateStudent, deleteStudent, Student, CombinedStudent } from "@/lib/supabase/students";
import { getAllLeaveRequests } from "@/lib/supabase/leaves";
import type { LeaveRequest } from "@/lib/supabase/leaves";
import { prepopulateExams } from "@/lib/supabase/exams";
import { Skeleton } from "../ui/skeleton";
import { UserPlus, Users, GraduationCap, Eye, Megaphone, CalendarCheck, Loader2, ArrowLeft, BookUp, ClipboardCheck, DollarSign, Camera, Settings, Info, CalendarOff } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "./StatCard";
import { Button } from "../ui/button";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { addAnnouncement, getAnnouncementsForClass, getAnnouncementsForTeachers, getAnnouncementsForAllStudents, updateAnnouncement, deleteAnnouncement, Announcement } from "@/lib/supabase/announcements";
import AnnouncementChat from "../teacher/AnnouncementChat";
import { useToast } from "@/hooks/use-toast";
import ClassChatGroup from "../teacher/ClassChatGroup";
import ManageHolidays from "./ManageHolidays";

const AddTeacherForm = dynamic(() => import('./AddTeacherForm'), {
    loading: () => <Skeleton className="h-96 w-full" />
});
const TeacherList = dynamic(() => import('./TeacherList'), {
    loading: () => <Skeleton className="h-64 w-full" />
});
const AddStudentForm = dynamic(() => import('./AddStudentForm'), {
    loading: () => <Skeleton className="h-96 w-full" />
});
const StudentList = dynamic(() => import('./StudentList'), {
    loading: () => <Skeleton className="h-64 w-full" />
});
const ApproveLeaves = dynamic(() => import('../teacher/ApproveLeaves'), {
    loading: () => <Skeleton className="h-48 w-full" />,
});
const GenerateSalary = dynamic(() => import('./GenerateSalary'), {
    loading: () => <Skeleton className="h-80 w-full" />
});
const SchoolSettingsForm = dynamic(() => import('./SchoolSettingsForm'), {
    loading: () => <Skeleton className="h-80 w-full" />
});

type CombinedTeacher = (Teacher & { status: 'Registered' });

type PrincipalView = "dashboard" | "manageTeachers" | "manageStudents" | "viewLeaves" | "makeAnnouncement" | "managePayroll" | "schoolSettings" | "manageHolidays";

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

const ownerUID = "946ba406-1ba6-49cf-ab78-f611d1350f33";

const classes = ["Nursery", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const sections = ["A", "B"];
const allClassSections = classes.flatMap(c => sections.map(s => `${c}-${s}`));


const AnnouncementView = ({ user, isOwner }: { user: User | null, isOwner: boolean }) => {
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const { toast } = useToast();

    const announcementGroups = useMemo(() => ["Teachers", "All Students", ...allClassSections], []);

    useEffect(() => {
        if (!selectedGroup) {
            setAnnouncements([]);
            return;
        };

        let unsubscribe: any;
        if (selectedGroup === 'Teachers') {
            unsubscribe = getAnnouncementsForTeachers(setAnnouncements);
        } else if (selectedGroup === 'All Students') {
            unsubscribe = getAnnouncementsForAllStudents(setAnnouncements);
        } else {
            unsubscribe = getAnnouncementsForClass(selectedGroup, setAnnouncements);
        }
        
        return () => {
            if (unsubscribe && typeof unsubscribe.unsubscribe === 'function') {
                unsubscribe.unsubscribe();
            }
        };
    }, [selectedGroup]);


    const handleSendMessage = async (content: string, category: string, file?: File) => {
        if (!user || !selectedGroup) {
            toast({ variant: 'destructive', title: 'Error', description: "No group selected." });
            return;
        }

        const announcementData: Partial<Announcement> = {
            title: "School Announcement",
            content,
            category,
            created_by: user.id,
            creator_name: isOwner ? "Owner" : "Principal",
            creator_role: isOwner ? "Owner" : "Principal",
        };

        if (selectedGroup === 'Teachers') {
            announcementData.target = 'teachers';
        } else if (selectedGroup === 'All Students') {
             announcementData.target = 'students';
             announcementData.target_audience = undefined;
        } else {
            announcementData.target = 'students';
            announcementData.target_audience = {
                type: 'class',
                value: selectedGroup
            };
        }

        try {
            await addAnnouncement(announcementData as Omit<Announcement, "id" | "created_at">, file);
            toast({
                title: "Announcement Published!",
                description: `Your announcement has been sent to ${selectedGroup}.`,
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: "Failed to send announcement." });
        }
    };

    const handleUpdateMessage = async (id: string, content: string) => {
      try {
        await updateAnnouncement(id, content);
        toast({ title: "Announcement Updated" });
      } catch (e: any) {
        toast({ variant: "destructive", title: "Error", description: "Could not update announcement." });
      }
    }

    const handleDeleteMessage = async (id: string) => {
        try {
            await deleteAnnouncement(id);
            toast({ title: "Announcement Deleted" });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error", description: "Could not delete announcement." });
        }
    }
    
    return (
        <div className="flex flex-1 md:grid md:grid-cols-[300px_1fr] md:border-t">
            <div className="border-b md:border-b-0 md:border-r">
                <ClassChatGroup 
                    assignedClasses={announcementGroups}
                    onSelectClass={setSelectedGroup}
                    selectedClass={selectedGroup}
                    isLoading={false}
                />
            </div>
            <div className="flex flex-col">
                <AnnouncementChat
                    announcements={announcements}
                    chatTitle={selectedGroup}
                    onSendMessage={handleSendMessage}
                    onUpdateMessage={handleUpdateMessage}
                    onDeleteMessage={handleDeleteMessage}
                    senderName={isOwner ? "Owner" : "Principal"}
                    senderRole={isOwner ? "Owner" : "Principal"}
                />
            </div>
        </div>
    )
}


export default function PrincipalDashboard() {
  const [activeView, setActiveView] = useState<PrincipalView>("dashboard");
  const [manageTeachersTab, setManageTeachersTab] = useState("addTeacher");
  const [manageStudentsTab, setManageStudentsTab] = useState("addStudent");
  const router = useRouter();
  const supabase = createClient();

  const [allStudents, setAllStudents] = useState<CombinedStudent[]>([]);
  const [allTeachers, setAllTeachers] = useState<CombinedTeacher[]>([]);
  const [allLeaves, setAllLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isOwner, setIsOwner] = useState(false);


  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        const authUser = session?.user ?? null;
        setUser(authUser);
        if(authUser && authUser.id === ownerUID) {
            setIsOwner(true);
        }
    });

    setIsLoading(true);

    prepopulateExams().catch(console.error);

    const unsubStudents = getStudentsAndPending(setAllStudents);
    const unsubTeachers = getTeachersAndPending(setAllTeachers);
    const unsubLeaves = getAllLeaveRequests(setAllLeaves);
    
    const timer = setTimeout(() => setIsLoading(false), 1500);

    return () => {
        authListener.subscription.unsubscribe();
        if (unsubStudents) unsubStudents();
        if (unsubTeachers) unsubTeachers();
        if (unsubLeaves) unsubLeaves.unsubscribe();
    };

  }, [supabase]);

  const studentLeaves = useMemo(() => allLeaves.filter(l => l.userRole === 'Student'), [allLeaves]);
  const teacherLeaves = useMemo(() => allLeaves.filter(l => l.userRole === 'Teacher'), [allLeaves]);


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
  const newAdmissionsCount = allStudents.filter(s => s.status === 'Registered').length;

  const renderContent = () => {
      switch(activeView) {
          case 'manageTeachers':
              return (
                   <Card>
                        <CardHeader>
                            <Button variant="ghost" onClick={() => setActiveView('dashboard')} className="justify-start p-0 h-auto mb-4 text-primary">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Dashboard
                            </Button>
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
                                        Fill out the form below to register a new teacher. An email with instructions to set their password will be sent to them.
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
                                            isLoading={isLoading}
                                            onUpdateTeacher={handleTeacherUpdated}
                                            onDeleteTeacher={handleTeacherDeleted}
                                        />
                                    </CardContent>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
              );
          case 'manageStudents':
              return (
                 <Card>
                    <CardHeader>
                         <Button variant="ghost" onClick={() => setActiveView('dashboard')} className="justify-start p-0 h-auto mb-4 text-primary">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Dashboard
                        </Button>
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
                                        Fill out the form to admit a new student. A student account will be created, and they must use the 'Forgot Password' link on the login page to set their password.
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
                                        isLoading={isLoading}
                                        onUpdateStudent={handleStudentUpdated}
                                        onDeleteStudent={handleStudentDeleted}
                                    />
                                </CardContent>
                            </TabsContent>
                    </Tabs>
                    </CardContent>
                </Card>
              );
          case 'viewLeaves':
               return (
                    <Card>
                        <CardHeader>
                            <Button variant="ghost" onClick={() => setActiveView('dashboard')} className="justify-start p-0 h-auto mb-4 text-primary">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Dashboard
                            </Button>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarCheck />
                                Review Leave Applications
                            </CardTitle>
                            <CardDescription>
                                Review and approve or reject leave applications from all students and teachers.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="students">
                                <TabsList className="grid grid-cols-2">
                                    <TabsTrigger value="students">Student Leaves ({pendingStudentLeavesCount})</TabsTrigger>
                                    <TabsTrigger value="teachers">Teacher Leaves ({pendingTeacherLeavesCount})</TabsTrigger>
                                </TabsList>
                                <TabsContent value="students" className="mt-4">
                                    <ApproveLeaves leaves={studentLeaves} title="Students" />
                                </TabsContent>
                                <TabsContent value="teachers" className="mt-4">
                                    <ApproveLeaves leaves={teacherLeaves} title="Teachers" isPrincipal={true} />
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
               );
          case 'makeAnnouncement':
              return (
                    <Card className="flex flex-col h-full">
                        <CardHeader>
                             <Button variant="ghost" onClick={() => setActiveView('dashboard')} className="justify-start p-0 h-auto mb-4 text-primary">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Dashboard
                            </Button>
                             <CardTitle className="flex items-center gap-2">
                                <Megaphone />
                                Make Announcement
                            </CardTitle>
                             <CardDescription>
                                Publish notices to all teachers or specific class groups.
                            </CardDescription>
                        </CardHeader>
                        <AnnouncementView user={user} isOwner={isOwner} />
                    </Card>
              );
          case 'managePayroll':
              return (
                    <Card>
                        <CardHeader>
                             <Button variant="ghost" onClick={() => setActiveView('dashboard')} className="justify-start p-0 h-auto mb-4 text-primary">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Dashboard
                            </Button>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign />
                                Manage Payroll
                            </CardTitle>
                            <CardDescription>
                                Generate and manage salary slips for teachers.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <GenerateSalary teachers={allTeachers.filter(t => t.status === 'Registered') as Teacher[]} isLoading={isLoading} />
                        </CardContent>
                    </Card>
              );
          case 'schoolSettings':
              return (
                  <Card>
                      <CardHeader>
                           <Button variant="ghost" onClick={() => setActiveView('dashboard')} className="justify-start p-0 h-auto mb-4 text-primary">
                              <ArrowLeft className="mr-2 h-4 w-4" />
                              Back to Dashboard
                          </Button>
                          <CardTitle className="flex items-center gap-2">
                              <Settings />
                              School Settings
                          </CardTitle>
                          <CardDescription>
                              Customize school name, logo, and theme colors.
                          </CardDescription>
                      </CardHeader>
                      <CardContent>
                          <SchoolSettingsForm />
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
                              Declare school holidays. These days will not be counted for attendance.
                          </CardDescription>
                      </CardHeader>
                      <CardContent>
                          <ManageHolidays />
                      </CardContent>
                  </Card>
              );
          default:
              return (
                <div className="space-y-6">
                    <div className="mx-auto grid w-full grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
                        <StatCard title="Total Students" value={isLoading ? '...' : allStudents.length.toString()} icon={GraduationCap} />
                        <StatCard title="Total Teachers" value={isLoading ? '...' : allTeachers.length.toString()} icon={Users} />
                        <StatCard title="New Admissions" value={isLoading ? '...' : newAdmissionsCount.toString()} icon={UserPlus} />
                        <StatCard title="Pending Leaves" value={isLoading ? '...' : totalPendingLeaves.toString()} icon={CalendarCheck} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <NavCard title="Manage Teachers" description="Add, view, and manage staff" icon={Users} onClick={() => setActiveView("manageTeachers")} />
                        <NavCard title="Manage Students" description="Admit, view, and manage students" icon={GraduationCap} onClick={() => setActiveView("manageStudents")} />
                        <NavCard title="Manage Payroll" description="Generate salary slips for teachers" icon={DollarSign} onClick={() => setActiveView("managePayroll")} />
                        <NavCard title="Review Leaves" description="Approve or reject leave requests" icon={CalendarCheck} onClick={() => setActiveView("viewLeaves")} />
                        <NavCard title="Make Announcement" description="Publish notices for staff and students" icon={Megaphone} onClick={() => setActiveView("makeAnnouncement")} />
                        <NavCard title="Manage Holidays" description="Declare school holidays" icon={CalendarOff} onClick={() => setActiveView("manageHolidays")} />
                        {isOwner && (
                            <NavCard title="School Settings" description="Customize branding and theme" icon={Settings} onClick={() => setActiveView("schoolSettings")} />
                        )}
                    </div>
                </div>
              );
      }
  }


  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header title={isOwner ? "Owner Dashboard" : "Principal Dashboard"} showAvatar={false} />
       <main className="flex flex-1 flex-col p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-6xl flex-1">
            {renderContent()}
        </div>
      </main>
    </div>
  );
}

    