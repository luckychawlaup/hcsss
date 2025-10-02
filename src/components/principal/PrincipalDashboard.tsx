

"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "@/components/dashboard/Header";
import { User, onAuthStateChanged } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getTeachersAndPending, updateTeacher, deleteTeacher, Teacher } from "@/lib/supabase/teachers";
import { getStudentsAndPending, updateStudent, deleteStudent, Student, CombinedStudent } from "@/lib/supabase/students";
import { getAllFeedback } from "@/lib/supabase/feedback";
import type { Feedback } from "@/lib/supabase/feedback";
import { prepopulateExams } from "@/lib/supabase/exams";
import { getAllLeaveRequests, LeaveRequest } from "@/lib/supabase/leaves";
import { Skeleton } from "../ui/skeleton";
import { UserPlus, Users, GraduationCap, Eye, Megaphone, CalendarCheck, Loader2, ArrowLeft, BookUp, ClipboardCheck, DollarSign, Camera, Settings, Info, CalendarOff, User as UserIcon, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "./StatCard";
import { Button } from "../ui/button";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import ManageHolidays from "./ManageHolidays";
import SchoolStatus from "../dashboard/SchoolStatus";
import DatesheetManager from "../teacher/DatesheetManager";

const TeacherList = dynamic(() => import('./TeacherList'), {
    loading: () => <Skeleton className="h-64 w-full" />
});
const StudentList = dynamic(() => import('./StudentList'), {
    loading: () => <Skeleton className="h-64 w-full" />
});
const AddTeacherForm = dynamic(() => import('./AddTeacherForm'), {
    loading: () => <Skeleton className="h-96 w-full" />
});
const AddStudentForm = dynamic(() => import('./AddStudentForm'), {
    loading: () => <Skeleton className="h-96 w-full" />
});
const ApproveLeaves = dynamic(() => import('../teacher/ApproveLeaves'), {
    loading: () => <Skeleton className="h-48 w-full" />,
});

type CombinedTeacher = (Teacher & { status: 'Registered' });

type PrincipalView = "dashboard" | "manageTeachers" | "manageStudents" | "viewFeedback" | "manageHolidays" | "reviewLeaves" | "manageDatesheet";

const NavCard = ({ title, description, icon: Icon, onClick }: { title:string, description:string, icon:React.ElementType, onClick:() => void }) => (
    <Card 
        className="group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer" 
        onClick={onClick}
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

const classes = ["Nursery", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const sections = ["A", "B"];
const allClassSections = classes.flatMap(c => sections.map(s => `${c}-${s}`));

export default function PrincipalDashboard() {
  const [activeView, setActiveView] = useState<PrincipalView>("dashboard");
  const [manageTeachersTab, setManageTeachersTab] = useState("viewTeachers");
  const [manageStudentsTab, setManageStudentsTab] = useState("viewStudents");
  const router = useRouter();
  const supabase = createClient();

  const [allStudents, setAllStudents] = useState<CombinedStudent[]>([]);
  const [allTeachers, setAllTeachers] = useState<CombinedTeacher[]>([]);
  const [allFeedback, setAllFeedback] = useState<Feedback[]>([]);
  const [allLeaves, setAllLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);


  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        const authUser = session?.user ?? null;
        setUser(authUser);
    });

    setIsLoading(true);

    prepopulateExams().catch(console.error);

    const unsubStudents = getStudentsAndPending(setAllStudents);
    const unsubTeachers = getTeachersAndPending(setAllTeachers);
    const unsubFeedback = getAllFeedback(setAllFeedback);
    const unsubLeaves = getAllLeaveRequests(setAllLeaves);
    
    const timer = setTimeout(() => setIsLoading(false), 1500);

    return () => {
        authListener.subscription.unsubscribe();
        if (unsubStudents) unsubStudents();
        if (unsubTeachers) unsubTeachers();
        if (unsubFeedback) unsubFeedback.unsubscribe();
        if (unsubLeaves) unsubLeaves.unsubscribe();
    };

  }, [supabase]);

  const principalFeedback = useMemo(() => {
    const principalCategories = [
        "General Issues", 
        "Academic Concerns", 
        "Discipline & Behaviour", 
        "Facilities & Infrastructure", 
        "School Portal / IT Issues", 
        "Suggestions & Ideas", 
        "Feedback"
    ];
    return allFeedback.filter(f => principalCategories.includes(f.category));
  }, [allFeedback]);

  const teacherLeaveRequests = useMemo(() => {
    return allLeaves.filter(l => l.userRole === 'Teacher');
  }, [allLeaves]);


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

  const pendingStudentFeedbackCount = principalFeedback.filter(l => l.status === 'Pending').length;
  const pendingLeavesCount = teacherLeaveRequests.filter(l => l.status === 'Pending').length;
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
                                    <TabsTrigger value="viewTeachers">View Teachers</TabsTrigger>
                                    <TabsTrigger value="addTeacher">Add Teacher</TabsTrigger>
                                </TabsList>
                                <TabsContent value="viewTeachers">
                                    <TeacherList 
                                        teachers={allTeachers} 
                                        isLoading={isLoading}
                                        onUpdateTeacher={handleTeacherUpdated}
                                        onDeleteTeacher={handleTeacherDeleted}
                                    />
                                </TabsContent>
                                <TabsContent value="addTeacher">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2 text-xl"><UserPlus />Register New Teacher</CardTitle>
                                            <CardDescription>
                                                Add a new teacher to the system. They will receive an email with a temporary password and instructions to complete their registration.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <AddTeacherForm onTeacherAdded={handleTeacherAdded} />
                                        </CardContent>
                                    </Card>
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
                                <TabsTrigger value="viewStudents">View Students</TabsTrigger>
                                <TabsTrigger value="addStudent">Add Student</TabsTrigger>
                            </TabsList>
                            <TabsContent value="viewStudents">
                                <StudentList
                                    students={allStudents}
                                    isLoading={isLoading}
                                    onUpdateStudent={handleStudentUpdated}
                                    onDeleteStudent={handleStudentDeleted}
                                />
                            </TabsContent>
                            <TabsContent value="addStudent">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-xl"><UserPlus />Admit New Student</CardTitle>
                                        <CardDescription>
                                            Add a new student to the school records. An account will be created, and an email will be sent with login instructions.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <AddStudentForm onStudentAdded={handleStudentAdded} />
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
              );
          case 'viewFeedback':
               return (
                    <Card>
                        <CardHeader>
                            <Button variant="ghost" onClick={() => setActiveView('dashboard')} className="justify-start p-0 h-auto mb-4 text-primary">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Dashboard
                            </Button>
                            <CardTitle className="flex items-center gap-2">
                                <ClipboardCheck />
                                Review Complaints & Feedback
                            </CardTitle>
                            <CardDescription>
                                Review and act on submissions from all students and teachers.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                           <ApproveLeaves leaves={principalFeedback as any} title="Submissions" isPrincipal={true} />
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
                                Review Teacher Leave Requests
                            </CardTitle>
                            <CardDescription>
                                Approve or reject leave requests from teachers.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                           <ApproveLeaves leaves={teacherLeaveRequests} title="Teacher Leaves" isPrincipal={true} />
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
                              Declare school holidays for the entire school or for specific classes.
                          </CardDescription>
                      </CardHeader>
                      <CardContent>
                          <ManageHolidays />
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
                                <Info />
                                Manage Datesheet
                            </CardTitle>
                            <CardDescription>
                                Create exams and set schedules for any class.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                           <DatesheetManager teacher={null} />
                        </CardContent>
                    </Card>
                );
          default:
              return (
                <div className="space-y-6">
                    <SchoolStatus />
                    <div className="mx-auto grid w-full grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
                        <StatCard title="Total Students" value={isLoading ? '...' : allStudents.length.toString()} icon={GraduationCap} />
                        <StatCard title="Total Teachers" value={isLoading ? '...' : allTeachers.length.toString()} icon={Users} />
                        <StatCard title="Pending Feedback" value={isLoading ? '...' : pendingStudentFeedbackCount.toString()} icon={ClipboardCheck} />
                        <StatCard title="Pending Leaves" value={isLoading ? '...' : pendingLeavesCount.toString()} icon={CalendarCheck} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <NavCard title="My Profile" description="View and manage your profile" icon={UserIcon} onClick={() => router.push('/principal/profile')} />
                        <NavCard title="Manage Teachers" description="Add, view, and manage staff" icon={Users} onClick={() => setActiveView("manageTeachers")} />
                        <NavCard title="Manage Students" description="Add, view, and manage students" icon={GraduationCap} onClick={() => setActiveView("manageStudents")} />
                        <NavCard title="Review Feedback" description="Review submissions and complaints" icon={ClipboardCheck} onClick={() => setActiveView("viewFeedback")} />
                        <NavCard title="Review Leaves" description="Approve or reject leave requests" icon={CalendarCheck} onClick={() => setActiveView("reviewLeaves")} />
                        <NavCard title="Make Announcement" description="Publish notices for staff and students" icon={Megaphone} onClick={() => router.push('/principal/announcements')} />
                        <NavCard title="Manage Holidays" description="Declare school holidays" icon={CalendarOff} onClick={() => setActiveView("manageHolidays")} />
                        <NavCard title="Manage Datesheet" description="Create exams and set schedules" icon={Info} onClick={() => setActiveView("manageDatesheet")} />
                    </div>
                </div>
              );
      }
  }


  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header title={"Principal Dashboard"} showAvatar={false} />
       <main className="flex flex-1 flex-col p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-6xl flex-1">
            {renderContent()}
        </div>
      </main>
    </div>
  );
}

    
