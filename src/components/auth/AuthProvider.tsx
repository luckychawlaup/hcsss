
"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { app } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";

const publicPaths = [
    "/login",
    "/auth/student/login",
    "/auth/teacher/login",
    "/auth/principal/login",
    "/auth/student/signup",
    "/auth/teacher/signup",
    "/auth/student/forgot-password",
    "/auth/teacher/forgot-password",
];

function Preloader() {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
            <div className="flex flex-col items-center justify-center gap-4">
                <Image src="https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hiltonconventschool_logo.png" alt="Hilton Convent School Logo" width={100} height={100} />
                <h1 className="text-2xl font-bold text-primary mt-4">Hilton Convent School</h1>
                <p className="text-muted-foreground">Loading, please wait...</p>
                 <Skeleton className="h-2 w-48 mt-4" />
            </div>
        </div>
    );
}

const getRoleFromCookie = () => {
    if (typeof document === 'undefined') return null;
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'principal-role' && value === 'true') return 'principal';
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
  const [user, setUser] = useState<User | "principal" | null>(null);
  const [loading, setLoading] = useState(true);

  const isPublicPath = publicPaths.includes(pathname);
  
  useEffect(() => {
    // 1. Check for principal cookie first. This is a non-Firebase auth user.
    const principalCookie = document.cookie.includes("principal-role=true");
    if (principalCookie) {
        setUser("principal");
        setLoading(false);
        return; // Stop further checks
    }

    // 2. If not principal, check for Firebase auth user (student/teacher)
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (authUser && authUser.emailVerified) {
        setUser(authUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  // While loading, show preloader
  if (loading) {
    return <Preloader />;
  }

  const role = getRoleFromCookie();
  const isPrincipalPath = pathname.startsWith('/principal');
  const isTeacherPath = pathname.startsWith('/teacher');
  const isStudentPath = !isPrincipalPath && !isTeacherPath && !isPublicPath;


  // --- REDIRECTION LOGIC ---

  // 1. If user is logged in but on a public path, redirect them to their dashboard
  if (user && isPublicPath) {
      if (user === "principal") {
          router.replace('/principal');
          return <Preloader />;
      }
      if (role === 'teacher') {
          router.replace('/teacher');
          return <Preloader />;
      }
      // Student is the default
      router.replace('/');
      return <Preloader />;
  }
  
  // 2. If user is NOT logged in and trying to access a protected path, redirect to login
  if (!user && !isPublicPath) {
      router.replace('/login');
      return <Preloader />;
  }
  
  // 3. Role-based route protection
  if (user) {
    if (user === "principal" && !isPrincipalPath) {
        router.replace('/principal');
        return <Preloader />;
    }
    if (role === 'teacher' && !isTeacherPath) {
        router.replace('/teacher');
        return <Preloader />;
    }
    if (role === 'student' && (isTeacherPath || isPrincipalPath)) {
        router.replace('/');
        return <Preloader />;
    }
  }


  return <>{children}</>;
}
