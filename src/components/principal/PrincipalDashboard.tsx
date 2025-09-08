import Header from "@/components/dashboard/Header";
import { AddTeacherForm } from "./AddTeacherForm";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Users, GraduationCap } from "lucide-react";
import { StatCard } from "./StatCard";

export default function PrincipalDashboard() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header title="Principal Dashboard" showAvatar={false} />
      <main className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8">
        
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Students" value="1250" icon={GraduationCap} />
            <StatCard title="Total Teachers" value="62" icon={Users} />
            <StatCard title="New Admissions" value="45" icon={UserPlus} />
            <StatCard title="Pending Leaves" value="8" icon={UserPlus} />
        </div>

        <div className="mx-auto w-full max-w-6xl">
            <Tabs defaultValue="addTeacher">
                 <TabsList className="grid w-full grid-cols-2 md:w-1/2 lg:w-1/3">
                    <TabsTrigger value="addTeacher">Manage Teachers</TabsTrigger>
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
                            <AddTeacherForm />
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
