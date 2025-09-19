
"use client";

import { useState, useEffect } from "react";
import Header from "@/components/dashboard/Header";
import { getAuth, User, onAuthStateChanged } from "firebase/auth";
import { app } from "@/lib/firebase";
import { getTeachers, updateTeacher, deleteTeacher, Teacher } from "@/lib/firebase/teachers";
import { getStudents, updateStudent, deleteStudent, Student } from "@/lib/firebase/students";
import { getLeaveRequestsForStudents, getLeaveRequestsForTeachers } from "@/lib/firebase/leaves";
import type { LeaveRequest } from "@/lib/firebase/leaves";
import { Skeleton } from "../ui/skeleton";
import { UserPlus, Users, GraduationCap, Eye, Megaphone, CalendarCheck, Loader2, ArrowLeft, BookUp, ClipboardCheck, DollarSign, CalendarPlus, Camera, Settings, Shield } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "./StatCard";
import { Button } from "../ui/button";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { SchoolSettings } from "@/lib/firebase/settings";
import { getSchoolSettings, updateSchoolSettings } from "@/lib/firebase/settings";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";


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
    loading: () => <Skeleton className="h-80 w-full" />
});
const GenerateSalary = dynamic(() => import('./GenerateSalary'), {
    loading: () => <Skeleton className="h-80 w-full" />
});
const SchoolSettingsForm = dynamic(() => import('./SchoolSettingsForm'), {
    loading: () => <Skeleton className="h-80 w-full" />
});


type PrincipalView = "dashboard" | "manageTeachers" | "manageStudents" | "viewLeaves" | "makeAnnouncement" | "managePayroll" | "schoolSettings" | "securitySettings";

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

function SecuritySettings() {
    const [is2faEnabled, setIs2faEnabled] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handle2faToggle = (checked: boolean) => {
        setIs2faEnabled(checked);
        setIsDialogOpen(true);
    }
    
    return (
         <>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Security Settings</CardTitle>
                        <CardDescription>Manage your account's security features.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label htmlFor="2fa-switch" className="text-base">Two-Factor Authentication</Label>
                                <p className="text-sm text-muted-foreground">
                                    Secure your account with an authenticator app.
                                </p>
                            </div>
                            <Switch
                                id="2fa-switch"
                                checked={is2faEnabled}
                                onCheckedChange={handle2faToggle}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
                        <DialogDescription>
                            This feature is coming soon. When enabled, you will be prompted to scan a QR code with an authenticator app like Google Authenticator or Authy to finalize setup.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => setIsDialogOpen(false)}>OK</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
         </>
    )
}

const ownerUID = "qEB6D6PbjycGSBKMPv9OGyorgnd2";


export default function PrincipalDashboard() {
  const [activeView, setActiveView] = useState<PrincipalView>("dashboard");
  const [manageTeachersTab, setManageTeachersTab] = useState("addTeacher");
  const [manageStudentsTab, setManageStudentsTab] = useState("addStudent");
  const router = useRouter();

  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [studentLeaves, setStudentLeaves] = useState<LeaveRequest[]>([]);
  const [teacherLeaves, setTeacherLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const auth = getAuth(app);


  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        if(user && user.uid === ownerUID) {
            setIsOwner(true);
        }
    });

    setIsLoading(true);

    const unsubStudents = getStudents(setAllStudents);
    const unsubTeachers = getTeachers(setAllTeachers);
    
    const timer = setTimeout(() => setIsLoading(false), 1500);

    return () => {
      unsubStudents();
      unsubTeachers();
      unsubscribeAuth();
      clearTimeout(timer);
    };

  }, [auth]);

   useEffect(() => {
    if (allStudents.length > 0) {
      const studentIds = allStudents.map((s) => s.id);
      const unsub = getLeaveRequestsForStudents(studentIds, (leaves) => {
        setStudentLeaves(leaves);
      });
      return () => unsub();
    }
  }, [allStudents]);

  useEffect(() => {
    if (allTeachers.length > 0) {
      const teacherIds = allTeachers.map((t) => t.id);
      const unsub = getLeaveRequestsForTeachers(teacherIds, (leaves) => {
        setTeacherLeaves(leaves);
      });
      return () => unsub();
    }
  }, [allTeachers]);


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
                            {isLoading ? <Skeleton className="h-48 w-full" /> : (
                                <Tabs defaultValue="students">
                                    <TabsList className="grid grid-cols-2">
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
               );
          case 'makeAnnouncement':
              return (
                    <Card>
                        <CardHeader>
                             <Button variant="ghost" onClick={() => setActiveView('dashboard')} className="justify-start p-0 h-auto mb-4 text-primary">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Dashboard
                            </Button>
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
                            <GenerateSalary teachers={allTeachers} isLoading={isLoading} />
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
          case 'securitySettings':
                return (
                    <Card>
                        <CardHeader>
                             <Button variant="ghost" onClick={() => setActiveView('dashboard')} className="justify-start p-0 h-auto mb-4 text-primary">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Dashboard
                            </Button>
                            <CardTitle className="flex items-center gap-2">
                                <Shield />
                                Security Settings
                            </CardTitle>
                            <CardDescription>
                                Manage account security features.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SecuritySettings />
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
                        <NavCard title="Security" description="Manage account security" icon={Shield} onClick={() => setActiveView("securitySettings")} />
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
