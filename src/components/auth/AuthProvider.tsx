
"use client";

import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { getTeacherByAuthId } from "@/lib/supabase/teachers";
import { useTheme } from "../theme/ThemeProvider";

const publicPaths = [
    "/login",
    "/auth/student/login",
    "/auth/teacher/login",
    "/auth/principal/login",
    "/auth/owner/login",
    "/auth/student/register",
    "/auth/teacher/register",
    "/auth/student/forgot-password",
    "/auth/teacher/forgot-password",
    "/auth/update-password",
    "/auth/callback"
];

const principalUID = "6cc51c80-e098-4d6d-8450-5ff5931b7391";
const ownerUID = "946ba406-1ba6-49cf-ab78-f611d1350f33";

function Preloader() {
    const { settings } = useTheme();
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
            <div className="flex flex-col items-center justify-center gap-2">
                <Image src={settings.logoUrl || "https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png"} alt="School Logo" width={100} height={100} />
                <h1 className="text-2xl font-bold text-primary mt-2">{settings.schoolName || "H.C.S.S.S."}</h1>
                <p className="text-muted-foreground text-sm">Loading, please wait...</p>
                 <Loader2 className="h-6 w-6 animate-spin text-primary mt-4" />
            </div>
        </div>
    );
}

export const getRole = async (user: User | null): Promise<'teacher' | 'student' | 'owner' | 'principal' | null> => {
    if (!user) return null;
    if (user.id === principalUID) return 'principal';
    if (user.id === ownerUID) return 'owner';
    
    // Check for teacher role by looking up their profile.
    const teacher = await getTeacherByAuthId(user.id);
    if (teacher) return 'teacher';
    
    return 'student'; // Default to student if not principal, owner, or teacher
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        const authUser = session?.user ?? null;
        
        if (event === 'PASSWORD_RECOVERY') {
            router.push('/auth/update-password');
            setLoading(false);
            return;
        }

        if (authUser) {
            const role = await getRole(authUser);
            const targetPath = role === 'principal' || role === 'owner' ? '/principal' : role === 'teacher' ? '/teacher' : '/';

            if (isPublicPath) {
                router.replace(targetPath);
            } else {
                 if (role === 'principal' || role === 'owner') {
                    if (!pathname.startsWith('/principal')) router.replace('/principal');
                } else if (role === 'teacher') {
                    if (!pathname.startsWith('/teacher') && !pathname.startsWith('/principal')) router.replace('/teacher');
                } else { // Assumed student
                    if (pathname.startsWith('/teacher') || pathname.startsWith('/principal')) router.replace('/');
                }
                setLoading(false);
            }
        } else {
            if (!isPublicPath) {
                router.replace('/login');
            } else {
                setLoading(false);
            }
        }
    });

    return () => {
        authListener.subscription.unsubscribe();
    };
  }, [supabase, pathname, router]);

  if (loading) {
    return <Preloader />;
  }

  return <>{children}</>;
}
