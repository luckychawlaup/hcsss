
"use client";

import { useState, useEffect } from "react";
import Header from "@/components/dashboard/Header";
import { User as AuthUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KeyRound, Mail, User } from "lucide-react";
import { UpdateEmailForm } from "@/components/profile/UpdateEmailForm";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

export default function OwnerProfilePage() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
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
            <Header title="Owner Profile" showAvatar={false} />
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
                                <p className="text-muted-foreground">{user?.email}</p>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Mail /> Change Login Email
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                             {isLoading ? (
                                <Skeleton className="h-40 w-full" />
                             ) : user?.email ? (
                                <UpdateEmailForm currentEmail={user.email} />
                             ) : <p className="text-muted-foreground">Could not load email information.</p>}
                        </CardContent>
                    </Card>
                     <Button variant="outline" onClick={() => router.push('/owner')}>
                        Back to Dashboard
                    </Button>
                </div>
            </main>
        </div>
    );
}
