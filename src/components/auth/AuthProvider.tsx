
"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User, signOut } from "firebase/auth";
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
    return 'student'; // Default to student if no specific role cookie is found
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
  const isPrincipalPath = pathname.startsWith('/principal');
  const isTeacherPath = pathname.startsWith('/teacher');

  useEffect(() => {
    const principalCookie = document.cookie.includes("principal-role=true");

    if (principalCookie) {
        setUser("principal");
        if (isPublicPath) {
            router.push("/principal");
        }
        setLoading(false);
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        if (authUser.emailVerified) {
          setUser(authUser);
           if (isPublicPath) {
             const role = getRoleFromCookie();
             if (role === 'teacher') router.push('/teacher');
             else router.push('/');
           }
        } else {
          // If email is not verified, sign them out.
          signOut(auth);
          setUser(null);
           if (!isPublicPath) {
             router.push("/login");
           }
        }
      } else {
        setUser(null);
        if (!isPublicPath && !isPrincipalPath) {
          router.push("/login");
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, router, pathname, isPublicPath, isPrincipalPath]);

  if (loading) {
    return <Preloader />;
  }
  
  if (!user && !isPublicPath) {
    return <Preloader />;
  }

  if (user && isPublicPath) {
     if (user === "principal") {
        router.push('/principal');
     } else {
        const role = getRoleFromCookie();
        if (role === 'teacher') router.push('/teacher');
        else router.push('/');
     }
    return <Preloader />;
  }

  // Protect routes based on role
  if (user) {
      const role = getRoleFromCookie();
      if(user === "principal" && !isPrincipalPath && !isPublicPath) {
           router.push('/principal');
           return <Preloader />;
      }
      if(role === 'teacher' && !isTeacherPath && !isPublicPath) {
          router.push('/teacher');
          return <Preloader />;
      }
       if(role === 'student' && (isTeacherPath || isPrincipalPath)) {
          router.push('/');
          return <Preloader />;
      }
  }


  return <>{children}</>;
}
