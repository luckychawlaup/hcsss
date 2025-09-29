
"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "@/components/dashboard/Header";
import { User, onAuthStateChanged } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "../ui/skeleton";
import { ArrowLeft, UserPlus, Users, GraduationCap, Megaphone, CalendarCheck, DollarSign, Info, CalendarOff, KeyRound, Calculator, School } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "../ui/button";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

const SchoolInfoForm = dynamic(() => import('../principal/SchoolInfoForm'), {
    loading: () => <Skeleton className="h-80 w-full" />
});

const GenerateSalary = dynamic(() => import('../principal/GenerateSalary'), {
    loading: () => <Skeleton className="h-80 w-full" />
});


type OwnerView = "dashboard" | "managePayroll" | "schoolInfo" | "manageAdmins";

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

const AdminInfoCard = ({ title, uid, role }: { title: string, uid: string, role: 'principal' | 'accountant' }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    {role === 'principal' ? <School /> : <Calculator />}
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">The user with the following User ID is assigned this role. You can find this ID in the Supabase 'auth.users' table.</p>
                <div className="mt-2 font-mono text-xs bg-muted p-2 rounded-md break-all">{uid}</div>
            </CardContent>
        </Card>
    )
};


export default function OwnerDashboard() {
  const [activeView, setActiveView] = useState<OwnerView>("dashboard");
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        const authUser = session?.user ?? null;
        setUser(authUser);
    });

    return () => {
        authListener.subscription.unsubscribe();
    };

  }, [supabase]);


  const renderContent = () => {
      switch(activeView) {
          case 'schoolInfo':
              return (
                  <Card>
                      <CardHeader>
                           <Button variant="ghost" onClick={() => setActiveView('dashboard')} className="justify-start p-0 h-auto mb-4 text-primary">
                              <ArrowLeft className="mr-2 h-4 w-4" />
                              Back to Dashboard
                          </Button>
                          <CardTitle className="flex items-center gap-2">
                              <Info />
                              School Information
                          </CardTitle>
                          <CardDescription>
                              Manage the school's public contact information. This is displayed on the website and documents.
                          </CardDescription>
                      </CardHeader>
                      <CardContent>
                          <SchoolInfoForm />
                      </CardContent>
                  </Card>
              );
            case 'managePayroll':
                // Placeholder - this would need teachers data to be passed
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
                                This is a placeholder for payroll management. A full implementation requires fetching teacher data.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground text-center">Payroll management UI would be here.</p>
                        </CardContent>
                    </Card>
                );
             case 'manageAdmins':
                 return (
                    <Card>
                        <CardHeader>
                            <Button variant="ghost" onClick={() => setActiveView('dashboard')} className="justify-start p-0 h-auto mb-4 text-primary">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Dashboard
                            </Button>
                            <CardTitle className="flex items-center gap-2">
                                <KeyRound />
                                Manage Admins
                            </CardTitle>
                            <CardDescription>
                                The Principal and Accountant roles are assigned to fixed User IDs for security.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <AdminInfoCard title="Principal" uid="6cc51c80-e098-4d6d-8450-5ff5931b7391" role="principal" />
                            <AdminInfoCard title="Accountant" uid="cf210695-e635-4363-aea5-740f2707a6d7" role="accountant" />
                        </CardContent>
                    </Card>
                );
          default:
              return (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <NavCard title="Manage Admins" description="View Principal and Accountant assignments" icon={KeyRound} onClick={() => setActiveView("manageAdmins")} />
                        <NavCard title="Manage Payroll" description="Generate and oversee staff salary" icon={DollarSign} onClick={() => setActiveView("managePayroll")} />
                        <NavCard title="School Information" description="Update public school details" icon={Info} onClick={() => setActiveView("schoolInfo")} />
                    </div>
                </div>
              );
      }
  }


  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header title={"Owner Dashboard"} showAvatar={false} />
       <main className="flex flex-1 flex-col p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-4xl flex-1">
            {renderContent()}
        </div>
      </main>
    </div>
  );
}
