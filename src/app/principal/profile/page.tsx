
"use client";

import { useState, useEffect } from "react";
import Header from "@/components/dashboard/Header";
import { User as AuthUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, User, Edit } from "lucide-react";
import { UpdateEmailForm } from "@/components/profile/UpdateEmailForm";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function PrincipalProfilePage() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            setIsLoading(false);
        };
        fetchUser();
    }, [supabase]);

    return (
        <div className="flex min-h-screen w-full flex-col bg-background">
            <Header title="Principal Profile" showAvatar={false} />
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="mx-auto w-full max-w-2xl space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User /> Account Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Skeleton className="h-6 w-1/2" />
                            ) : (
                                <div className="flex items-center justify-between group">
                                    <p className="text-muted-foreground">{user?.email}</p>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => setIsEmailDialogOpen(true)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                     <Button variant="outline" onClick={() => router.push('/principal')}>
                        Back to Dashboard
                    </Button>
                </div>
            </main>
            {user && (
                <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Change Login Email</DialogTitle>
                            <DialogDescription>
                                A confirmation link will be sent to both your old and new email addresses.
                            </DialogDescription>
                        </DialogHeader>
                        <UpdateEmailForm currentEmail={user.email!} />
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
