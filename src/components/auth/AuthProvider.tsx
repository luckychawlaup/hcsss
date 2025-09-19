
"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { app } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { getTeacherByAuthId } from "@/lib/firebase/teachers";
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
];

const principalUID = "IIDjN5e6RzUMFGOYJ4kE7t3YqgZ2";
const ownerUID = "qEB6D6PbjycGSBKMPv9OGyorgnd2";


function Preloader() {
    const { settings } = useTheme();
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
            <div className="flex flex-col items-center justify-center gap-4">
                <Image src={settings.logoUrl || "https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png"} alt="School Logo" width={100} height={100} />
                <h1 className="text-2xl font-bold text-primary mt-4">{settings.schoolName || "H.C.S.S.S."}</h1>
                <p className="text-muted-foreground">Loading, please wait...</p>
                 <Loader2 className="h-8 w-8 animate-spin text-primary mt-4" />
            </div>
        </div>
    );
}

const getRole = async (user: User | null): Promise<'teacher' | 'student' | 'owner' | 'principal' | null> => {
    if (!user) return null;
    if (user.uid === principalUID) return 'principal';
    if (user.uid === ownerUID) return 'owner';
    
    // Check for teacher role by looking up their profile.
    // This is more reliable than a cookie which can be manipulated.
    const teacher = await getTeacherByAuthId(user.uid);
    if (teacher) return 'teacher';
    
    return 'student'; // Default to student if not principal, owner, or teacher
}


export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = getAuth(app);
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        const role = await getRole(authUser);
        
        if (isPublicPath) {
            // If on a public page (like login) but already authenticated, redirect
            if (role === 'principal' || role === 'owner') {
                router.replace('/principal');
            } else if (role === 'teacher') {
                router.replace('/teacher');
            } else {
                router.replace('/');
            }
        } else {
            // If on a protected page, enforce role-based access
            if (role === 'principal' || role === 'owner') {
                if (!pathname.startsWith('/principal')) {
                    router.replace('/principal');
                }
            } else if (role === 'teacher') {
                if (!pathname.startsWith('/teacher') || pathname.startsWith('/principal')) {
                    router.replace('/teacher');
                }
            } else { // Assumed student
                if (pathname.startsWith('/teacher') || pathname.startsWith('/principal')) {
                    router.replace('/');
                }
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

    return () => unsubscribe();
  }, [auth, pathname, router]);

  if (loading) {
    return <Preloader />;
  }

  return <>{children}</>;
}
