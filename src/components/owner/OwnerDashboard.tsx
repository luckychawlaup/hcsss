
"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "@/components/dashboard/Header";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "../ui/skeleton";
import { ArrowLeft, UserPlus, Users, GraduationCap, DollarSign, Info, KeyRound, Calculator, School, User as UserIcon, Trash2, Loader2, AlertTriangle, Eye, CheckCircle, Megaphone, Copy } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "../ui/button";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { addAdmin, getAdmins, removeAdmin, AdminUser, resendAdminConfirmation } from "@/lib/supabase/admins";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AddAdminForm from "./AddAdminForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "../ui/input";

const SchoolInfoForm = dynamic(() => import('../principal/SchoolInfoForm'), {
    loading: () => <Skeleton className="h-80 w-full" />
});

const GenerateSalary = dynamic(() => import('../principal/GenerateSalary'), {
    loading: () => <Skeleton className="h-80 w_full" />
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

const ManageAdminRoles = () => {
    const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const [manageAdminsTab, setManageAdminsTab] = useState("viewAdmins");
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
    const [isResending, setIsResending] = useState(false);


    const fetchAdmins = async () => {
        setIsLoading(true);
        try {
            const admins = await getAdmins();
            setAdminUsers(admins);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch administrator list.'});
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchAdmins();
    }, []);

    const principals = adminUsers.filter(u => u.role === 'principal');
    const accountants = adminUsers.filter(u => u.role === 'accountant');

    const handleRemove = async (user: AdminUser) => {
        setIsDeleting(user.uid);
        try {
            await removeAdmin(user.uid);
            setAdminUsers(prev => prev.filter(u => u.uid !== user.uid));
            toast({ title: "Admin Role Removed", description: `${user.name}'s access has been revoked.` });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: `Failed to remove user role: ${error.message}` });
        } finally {
            setIsDeleting(null);
        }
    };
    
    const handleAdminAdded = () => {
        fetchAdmins();
        setManageAdminsTab("viewAdmins");
    }
    
    const openResendDialog = (admin: AdminUser) => {
        setSelectedAdmin(admin);
        setIsKeyDialogOpen(true);
    }
    
    const handleResendConfirmation = async () => {
        if (!selectedAdmin) return;
        setIsResending(true);
        try {
            await resendAdminConfirmation(selectedAdmin.email);
            toast({ title: "Email Sent!", description: `A new password setup link has been sent to ${selectedAdmin.email}.` });
            setIsKeyDialogOpen(false);
        } catch (error) {
             toast({ variant: "destructive", title: "Error", description: "Failed to send email." });
        } finally {
            setIsResending(false);
        }
    }

    if (isLoading) return <Skeleton className="h-64 w-full" />;

    return (
        <>
        <Tabs value={manageAdminsTab} onValueChange={setManageAdminsTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="viewAdmins">View Admins</TabsTrigger>
                <TabsTrigger value="addAdmin">Add Admin</TabsTrigger>
            </TabsList>
            <TabsContent value="viewAdmins">
                <div className="space-y-6 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2"><School /> Principals ({principals.length}/5)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                             {principals.length > 0 ? principals.map(p => (
                                <div key={p.uid} className="flex items-center justify-between rounded-md border p-3 bg-secondary/50">
                                    <div>
                                        <p className="font-semibold">{p.name}</p>
                                        <p className="text-sm text-muted-foreground">{p.email}</p>
                                    </div>
                                    <div>
                                        <Button size="icon" variant="ghost" onClick={() => openResendDialog(p)} disabled={isResending}>
                                             {isResending && selectedAdmin?.uid === p.uid ? <Loader2 className="h-4 w-4 animate-spin"/> : <KeyRound className="h-4 w-4 text-blue-600" />}
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => handleRemove(p)} disabled={isDeleting === p.uid}>
                                            {isDeleting === p.uid ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4 text-destructive" />}
                                        </Button>
                                    </div>
                                </div>
                            )) : <p className="text-sm text-muted-foreground text-center py-4">No principals assigned.</p>}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2"><Calculator /> Accountants ({accountants.length}/10)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {accountants.length > 0 ? accountants.map(a => (
                                <div key={a.uid} className="flex items-center justify-between rounded-md border p-3 bg-secondary/50">
                                    <div>
                                        <p className="font-semibold">{a.name}</p>
                                        <p className="text-sm text-muted-foreground">{a.email}</p>
                                    </div>
                                     <div>
                                        <Button size="icon" variant="ghost" onClick={() => openResendDialog(a)} disabled={isResending}>
                                            {isResending && selectedAdmin?.uid === a.uid ? <Loader2 className="h-4 w-4 animate-spin"/> : <KeyRound className="h-4 w-4 text-blue-600" />}
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => handleRemove(a)} disabled={isDeleting === a.uid}>
                                            {isDeleting === a.uid ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4 text-destructive" />}
                                        </Button>
                                    </div>
                                </div>
                            )) : <p className="text-sm text-muted-foreground text-center py-4">No accountants assigned.</p>}
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
            <TabsContent value="addAdmin">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl"><UserPlus />Register New Administrator</CardTitle>
                        <CardDescription>
                            Create an account for a new Principal or Accountant. They will receive an email to set their password.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AddAdminForm onAdminAdded={handleAdminAdded} />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
         <Dialog open={isKeyDialogOpen} onOpenChange={setIsKeyDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Resend Setup Email</DialogTitle>
                    <DialogDescription>
                        This will send a new one-time password setup link to <span className="font-semibold">{selectedAdmin?.email}</span>. Are you sure?
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsKeyDialogOpen(false)} disabled={isResending}>Cancel</Button>
                    <Button onClick={handleResendConfirmation} disabled={isResending}>
                        {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send New Link
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
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
                                Add or remove Principal and Accountant roles. Changes take effect immediately.
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
                        <NavCard title="Send Announcements" description="Broadcast messages to any group" icon={Megaphone} onClick={() => router.push('/owner/announcements')} />
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
