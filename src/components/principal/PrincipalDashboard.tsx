
"use client";

import { useState, useEffect } from "react";
import Header from "@/components/dashboard/Header";
import { getAuth, User, onAuthStateChanged } from "firebase/auth";
import { app } from "@/lib/firebase";
import { getTeachersAndPending, updateTeacher, deleteTeacher, Teacher, PendingTeacher } from "@/lib/firebase/teachers";
import { getStudents, updateStudent, deleteStudent, Student } from "@/lib/firebase/students";
import { getLeaveRequestsForStudents, getLeaveRequestsForTeachers } from "@/lib/firebase/leaves";
import type { LeaveRequest } from "@/lib/firebase/leaves";
import { Skeleton } from "../ui/skeleton";
import { UserPlus, Users, GraduationCap, Eye, Megaphone, CalendarCheck, Loader2, ArrowLeft, BookUp, ClipboardCheck, DollarSign, Camera, Settings, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "./StatCard";
import { Button } from "../ui/button";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { getAllAnnouncements, Announcement } from "@/lib/firebase/announcements";
import { cn } from "@/lib/utils";


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
const MakeAnnouncementForm = dynamic(() => import('./MakeAnnouncementForm'), {
    loading: () => <Skeleton className="h-80 w-full" />,
});
const GenerateSalary = dynamic(() => import('./GenerateSalary'), {
    loading: () => <Skeleton className="h-80 w-full" />
});
const SchoolSettingsForm = dynamic(() => import('./SchoolSettingsForm'), {
    loading: () => <Skeleton className="h-80 w-full" />,
});

type CombinedTeacher = (Teacher & { status: 'Registered' }) | (PendingTeacher & { status: 'Pending' });

type PrincipalView = "dashboard" | "manageTeachers" | "manageStudents" | "viewLeaves" | "makeAnnouncement" | "managePayroll" | "schoolSettings";

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

const ownerUID = "qEB6D6PbjycGSBKMPv9OGyorgnd2";

const getCategoryStyles = (category: string) => {
    switch (category.toLowerCase()) {
        case "urgent":
        return "bg-destructive/10 border-l-4 border-destructive";
        case "event":
        return "bg-primary/10 border-l-4 border-primary";
        default:
        return "bg-secondary border-l-4 border-secondary-foreground";
    }
};


export default function PrincipalDashboard() {
  const [activeView, setActiveView] = useState<PrincipalView>("dashboard");
  const [manageTeachersTab, setManageTeachersTab] = useState("addTeacher");
  const [manageStudentsTab, setManageStudentsTab] = useState("addStudent");
  const router = useRouter();

  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [allTeachers, setAllTeachers] = useState<CombinedTeacher[]>([]);
  const [studentLeaves, setStudentLeaves] = useState<LeaveRequest[]>([]);
  const [teacherLeaves, setTeacherLeaves] = useState<LeaveRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const auth = getAuth(app);


  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
        setUser(authUser);
        if(authUser && authUser.uid === ownerUID) {
            setIsOwner(true);
        }
    });

    setIsLoading(true);

    const unsubStudents = getStudents(setAllStudents);
    const unsubTeachers = getTeachersAndPending(setAllTeachers);
    const unsubAnnouncements = getAllAnnouncements(setAnnouncements);
    
    // Give a bit of time for initial data to load for stat cards
    const timer = setTimeout(() => setIsLoading(false), 1500);

    return () => {
      unsubStudents();
      unsubTeachers();
      unsubAnnouncements();
      unsubscribeAuth();
      clearTimeout(timer);
    };

  }, [auth]);

   useEffect(() => {
    if (activeView === 'viewLeaves' && allStudents.length > 0) {
      const studentIds = allStudents.map((s) => s.id);
      const unsub = getLeaveRequestsForStudents(studentIds, (leaves) => {
        setStudentLeaves(leaves);
      });
      return () => unsub();
    }
  }, [activeView, allStudents]);

  useEffect(() => {
    if (activeView === 'viewLeaves' && allTeachers.length > 0) {
      const registeredTeacherIds = allTeachers
        .filter(t => t.status === 'Registered')
        .map((t) => t.id);
        
      if (registeredTeacherIds.length > 0) {
        const unsub = getLeaveRequestsForTeachers(registeredTeacherIds, (leaves) => {
            setTeacherLeaves(leaves);
        });
        return () => unsub();
      }
    }
  }, [activeView, allTeachers]);


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
                    <div className="flex flex-col h-[calc(100vh-10rem)]">
                        <div className="flex-shrink-0">
                            <Button variant="ghost" onClick={() => setActiveView('dashboard')} className="justify-start p-0 h-auto mb-4 text-primary">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Dashboard
                            </Button>
                            <h2 className="text-2xl font-bold flex items-center gap-2 mb-4"><Megaphone/> Announcements</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-4 pr-4">
                         {announcements.length === 0 ? (
                                <Card className="flex flex-col items-center justify-center p-8 h-full text-center">
                                    <Info className="h-10 w-10 text-muted-foreground mb-4"/>
                                    <p className="text-muted-foreground font-semibold">No announcements sent yet</p>
                                    <p className="text-sm text-muted-foreground">Use the form below to send your first announcement.</p>
                                </Card>
                            ) : (
                                announcements.map((notice) => (
                                    <div key={notice.id} className={cn("flex flex-col gap-1 p-3 rounded-lg shadow-sm w-fit max-w-lg ml-auto", getCategoryStyles(notice.category))}>
                                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                            <span className="text-sm font-semibold text-foreground">{notice.creatorName}</span>
                                            <span className="text-xs font-normal text-muted-foreground">{notice.creatorRole}</span>
                                            <span className="text-xs font-normal text-muted-foreground">{new Date(notice.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-sm font-semibold text-foreground py-1">{notice.title}</p>
                                        <p className="text-sm font-normal text-muted-foreground">{notice.content}</p>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="mt-4 flex-shrink-0">
                            <MakeAnnouncementForm currentUser={user} isOwner={isOwner} />
                        </div>
                    </div>
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
          default:
              return (
                <div className="space-y-6">
                    <div className="mx-auto grid w-full grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
                        <StatCard title="Total Students" value={isLoading ? '...' : allStudents.length.toString()} icon={GraduationCap} />
                        <StatCard title="Total Teachers" value={isLoading ? '...' : allTeachers.length.toString()} icon={Users} />
                        <StatCard title="New Admissions" value="45" icon={UserPlus} />
                        <StatCard title="Pending Leaves" value={isLoading ? '...' : totalPendingLeaves.toString()} icon={CalendarCheck} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <NavCard title="Manage Teachers" description="Add, view, and manage staff" icon={Users} onClick={() => setActiveView("manageTeachers")} />
                        <NavCard title="Manage Students" description="Admit, view, and manage students" icon={GraduationCap} onClick={() => setActiveView("manageStudents")} />
                        <NavCard title="Manage Payroll" description="Generate salary slips for teachers" icon={DollarSign} onClick={() => setActiveView("managePayroll")} />
                        <NavCard title="Review Leaves" description="Approve or reject leave requests" icon={CalendarCheck} onClick={() => setActiveView("viewLeaves")} />
                        <NavCard title="Make Announcement" description="Publish notices for staff and students" icon={Megaphone} onClick={() => setActiveView("makeAnnouncement")} />
                        <NavCard title="School Gallery" description="View and manage school photos" icon={Camera} onClick={() => router.push('/gallery')} />
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
      <main className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-6xl">
            {renderContent()}
        </div>
      </main>
    </div>
  );
}
