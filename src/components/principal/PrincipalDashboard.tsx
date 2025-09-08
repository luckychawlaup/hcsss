
"use client";

import { useState, useEffect } from "react";
import Header from "@/components/dashboard/Header";
import { AddTeacherForm } from "./AddTeacherForm";
import { TeacherList } from "./TeacherList";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Users, GraduationCap, Eye } from "lucide-react";
import { StatCard } from "./StatCard";

// Define the Teacher type, you can expand this as needed
export interface Teacher {
  id: string;
  name: string;
  dob: string;
  fatherName: string;
  motherName: string;
  phoneNumber: string;
  address: string;
  subject: string;
  classTaught: string;
  classTeacherOf?: string;
}


export default function PrincipalDashboard() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [activeTab, setActiveTab] = useState("addTeacher");

  useEffect(() => {
    // Load teachers from localStorage when the component mounts
    const storedTeachers = JSON.parse(localStorage.getItem("teachers") || "[]");
    setTeachers(storedTeachers);
  }, []);

  const handleTeacherAdded = (newTeacher: Teacher) => {
    const updatedTeachers = [...teachers, newTeacher];
    setTeachers(updatedTeachers);
    // Switch to the view teachers tab after adding a new one
    setActiveTab("viewTeachers");
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header title="Principal Dashboard" showAvatar={false} />
      <main className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8">
        
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Students" value="1250" icon={GraduationCap} />
            <StatCard title="Total Teachers" value={teachers.length.toString()} icon={Users} />
            <StatCard title="New Admissions" value="45" icon={UserPlus} />
            <StatCard title="Pending Leaves" value="8" icon={UserPlus} />
        </div>

        <div className="mx-auto w-full max-w-6xl">
            <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="addTeacher">
                 <TabsList className="grid w-full grid-cols-3 md:w-1/2 lg:w-1/3">
                    <TabsTrigger value="addTeacher">Add Teacher</TabsTrigger>
                    <TabsTrigger value="viewTeachers">View Teachers</TabsTrigger>
                    <TabsTrigger value="addStudent">Manage Students</TabsTrigger>
                </TabsList>
                <TabsContent value="addTeacher">
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UserPlus />
                                Add New Teacher
                            </CardTitle>
                            <CardDescription>
                                Fill out the form below to register a new teacher in the system. A unique 8-digit Teacher ID will be generated upon submission.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AddTeacherForm onTeacherAdded={handleTeacherAdded} />
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="viewTeachers">
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Eye />
                                View All Teachers
                            </CardTitle>
                            <CardDescription>
                                Here is a list of all teachers currently in the system.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                           <TeacherList teachers={teachers} />
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="addStudent">
                    <Card className="mt-4">
                        <CardHeader>
                             <CardTitle className="flex items-center gap-2">
                                <UserPlus />
                                Add New Student
                            </CardTitle>
                             <CardDescription>
                                This feature is coming soon.
                            </CardDescription>
                        </CardHeader>
                         <CardContent>
                            <p className="text-muted-foreground">The ability to add and manage students will be available here shortly.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
      </main>
    </div>
  );
}
