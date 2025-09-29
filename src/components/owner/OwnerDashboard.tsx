
"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "@/components/dashboard/Header";
import { User, onAuthStateChanged } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "../ui/skeleton";
import { ArrowLeft, UserPlus, Users, GraduationCap, Megaphone, CalendarCheck, DollarSign, Info, CalendarOff, KeyRound, Calculator, School, User as UserIcon, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "../ui/button";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";

const SchoolInfoForm = dynamic(() => import('../principal/SchoolInfoForm'), {
    loading: () => <Skeleton className="h-80 w-full" />
});

const GenerateSalary = dynamic(() => import('../principal/GenerateSalary'), {
    loading: () => <Skeleton className="h-80 w-full" />
});

type AdminRole = 'principal' | 'accountant';
interface AdminUser {
    uid: string;
    role: AdminRole;
}

const supabase = createClient();

const getAdminRoles = async (): Promise<AdminUser[]> => {
    const { data, error } = await supabase.from('admin_roles').select('uid, role');
    if (error) {
        console.error("Error fetching admin roles:", error);
        return [];
    }
    return data as AdminUser[];
};

const addAdminRole = async (uid: string, role: AdminRole): Promise<AdminUser | null> => {
    const { data, error } = await supabase.from('admin_roles').insert({ uid, role }).select().single();
    if (error) {
        console.error(`Error adding ${role}:`, error);
        throw error;
    }
    return data;
};

const removeAdminRole = async (uid: string): Promise<void> => {
    const { error } = await supabase.from('admin_roles').delete().eq('uid', uid);
    if (error) {
        console.error("Error removing admin role:", error);
        throw error;
    }
};


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

const ManageAdminRoles = () => {
    const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newPrincipalId, setNewPrincipalId] = useState("");
    const [newAccountantId, setNewAccountantId] = useState("");
    const { toast } = useToast();

    useEffect(() => {
        const fetchAdmins = async () => {
            setIsLoading(true);
            const admins = await getAdminRoles();
            setAdminUsers(admins);
            setIsLoading(false);
        };
        fetchAdmins();
    }, []);

    const principals = adminUsers.filter(u => u.role === 'principal');
    const accountants = adminUsers.filter(u => u.role === 'accountant');

    const handleAdd = async (role: AdminRole) => {
        const uid = role === 'principal' ? newPrincipalId : newAccountantId;
        if (!uid.trim()) {
            toast({ variant: "destructive", title: "UID cannot be empty." });
            return;
        }

        try {
            const newUser = await addAdminRole(uid, role);
            if (newUser) {
                setAdminUsers(prev => [...prev, newUser]);
                toast({ title: `${role.charAt(0).toUpperCase() + role.slice(1)} added successfully.` });
                if (role === 'principal') setNewPrincipalId("");
                else setNewAccountantId("");
            }
        } catch (error: any) {
            let message = "Failed to add user.";
            if (error.code === '23505') message = "This UID is already assigned a role.";
            toast({ variant: "destructive", title: "Error", description: message });
        }
    };

    const handleRemove = async (uid: string) => {
        try {
            await removeAdminRole(uid);
            setAdminUsers(prev => prev.filter(u => u.uid !== uid));
            toast({ title: "User role removed." });
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to remove user role." });
        }
    };

    if (isLoading) return <Skeleton className="h-64 w-full" />;

    return (
        <div className="space-y-6">
            {/* Principals */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><School /> Principals ({principals.length}/5)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        {principals.map(p => (
                            <div key={p.uid} className="flex items-center justify-between rounded-md border p-2 bg-secondary/50">
                                <span className="font-mono text-xs break-all px-2">{p.uid}</span>
                                <Button size="icon" variant="ghost" onClick={() => handleRemove(p.uid)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                        ))}
                         {principals.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No principals assigned.</p>}
                    </div>
                   
                    {principals.length < 5 && (
                        <div className="flex gap-2">
                            <Input value={newPrincipalId} onChange={e => setNewPrincipalId(e.target.value)} placeholder="Enter new Principal User ID" />
                            <Button onClick={() => handleAdd('principal')}>Add</Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Accountants */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Calculator /> Accountants ({accountants.length}/10)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        {accountants.map(a => (
                            <div key={a.uid} className="flex items-center justify-between rounded-md border p-2 bg-secondary/50">
                                <span className="font-mono text-xs break-all px-2">{a.uid}</span>
                                <Button size="icon" variant="ghost" onClick={() => handleRemove(a.uid)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                        ))}
                         {accountants.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No accountants assigned.</p>}
                    </div>
                     {accountants.length < 10 && (
                        <div className="flex gap-2">
                            <Input value={newAccountantId} onChange={e => setNewAccountantId(e.target.value)} placeholder="Enter new Accountant User ID" />
                            <Button onClick={() => handleAdd('accountant')}>Add</Button>
                        </div>
                     )}
                </CardContent>
            </Card>
             <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                    You can find the User ID (UID) for any registered user in the Supabase 'auth.users' table.
                </AlertDescription>
            </Alert>
        </div>
    );
};


export default function OwnerDashboard() {
  const [activeView, setActiveView] = useState<OwnerView>("dashboard");
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

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
                                Add or remove User IDs for Principal and Accountant roles. Changes take effect immediately.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           <ManageAdminRoles />
                        </CardContent>
                    </Card>
                );
          default:
              return (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <NavCard title="My Profile" description="Manage your account settings" icon={UserIcon} onClick={() => router.push('/owner/profile')} />
                        <NavCard title="Manage Admins" description="Add or remove principals & accountants" icon={KeyRound} onClick={() => setActiveView("manageAdmins")} />
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
