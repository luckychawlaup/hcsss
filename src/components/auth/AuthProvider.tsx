
"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { app } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import Image from "next/image";

const publicPaths = [
    "/login",
    "/auth/student/login",
    "/auth/teacher/login",
    "/auth/principal/login",
    "/auth/student/signup",
    "/auth/teacher/register",
    "/auth/student/forgot-password",
    "/auth/teacher/forgot-password",
];

const principalUID = "hvldHzYq4ZbZlc7nym3ICNaEI1u1";


function Preloader() {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
            <div className="flex flex-col items-center justify-center gap-4">
                <Image src="https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hiltonconventschool_logo.png" alt="Hilton Convent School Logo" width={100} height={100} />
                <h1 className="text-2xl font-bold text-primary mt-4">Hilton Convent School</h1>
                <p className="text-muted-foreground">Loading, please wait...</p>
                 <Loader2 className="h-8 w-8 animate-spin text-primary mt-4" />
            </div>
        </div>
    );
}

const getRoleFromCookie = () => {
    if (typeof document === 'undefined') return 'student'; // Default to student on server
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'teacher-role' && value === 'true') return 'teacher';
    }
    return 'student'; // Default to student
}


export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = getAuth(app);
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isPublicPath = publicPaths.includes(pathname);

    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        setUser(authUser);
        const isPrincipal = authUser.uid === principalUID;
        const role = getRoleFromCookie();
        
        if (isPublicPath) {
            if (isPrincipal) {
                router.replace('/principal');
            } else if (role === 'teacher') {
                router.replace('/teacher');
            } else {
                router.replace('/');
            }
        } else if (isPrincipal) {
            if (!pathname.startsWith('/principal')) {
                router.replace('/principal');
            } else {
                setLoading(false);
            }
        } else if (role === 'teacher') {
            if (!pathname.startsWith('/teacher')) {
                router.replace('/teacher');
            } else {
                setLoading(false);
            }
        } else if (role === 'student') {
            if (pathname.startsWith('/teacher') || pathname.startsWith('/principal')) {
                router.replace('/');
            } else {
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
      } else {
        setUser(null);
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
