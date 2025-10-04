

"use client";

import { useState, useEffect } from "react";
import Header from "@/components/dashboard/Header";
import { User as AuthUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getAdminByUid, AdminUser } from "@/lib/supabase/admins";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { UpdateEmailForm } from "@/components/profile/UpdateEmailForm";
import { StudentProfileDetails, ProfileSkeleton, TeacherProfile } from "@/components/profile/ProfileDetails";


export default function OwnerProfilePage() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [profile, setProfile] = useState<AdminUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            if (user) {
                const adminProfile = await getAdminByUid(user.id);
                 if (adminProfile) {
                    setProfile(adminProfile);
                } else {
                    // Create a synthetic profile for the owner if not in DB
                    setProfile({
                        uid: user.id,
                        name: "Owner",
                        email: user.email || "owner@hcs.com",
                        role: 'owner' as any,
                    });
                }
            }
            setIsLoading(false);
        };
        fetchUser();
    }, [supabase]);

    if (isLoading) {
       return (
         <div className="flex min-h-screen w-full flex-col bg-background">
            <Header title="Owner Profile" showAvatar={false} />
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
                 <ProfileSkeleton />
            </main>
        </div>
       )
    }

    if (!profile) {
        return (
             <div className="flex min-h-screen w-full flex-col bg-background">
                <Header title="Owner Profile" showAvatar={false} />
                <main className="flex-1 p-4 sm:p-6 lg:p-8">
                    <p>Could not load profile.</p>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-background">
            <Header title="Owner Profile" showAvatar={false} />
             <main className="flex-1">
                 <div className="pb-20">
                    <div>
                        <TeacherProfile teacher={profile as any} />
                    </div>
                    <div className="p-4 sm:p-6 lg:p-8 space-y-4">
                        <StudentProfileDetails student={profile as any} user={user} />
                    </div>
                </div>
            </main>
        </div>
    );
}

