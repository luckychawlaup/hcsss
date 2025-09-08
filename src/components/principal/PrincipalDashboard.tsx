import Header from "@/components/dashboard/Header";
import { AddTeacherForm } from "./AddTeacherForm";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent
} from "@/components/ui/card";
import { UserPlus } from "lucide-react";

export default function PrincipalDashboard() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header title="Principal Dashboard" showAvatar={false} />
      <main className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-4xl">
            <Card>
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
        </div>
      </main>
    </div>
  );
}
