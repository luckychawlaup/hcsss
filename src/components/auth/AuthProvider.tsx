
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoading(true);
      const principalCookie = document.cookie.includes("principal-role=true");

      if (principalCookie) {
        setUser("principal");
        if(isPublicPath){
            router.push("/principal");
        }
      } else if (user) {
        if (user.emailVerified) {
          setUser(user);
           if (isPublicPath) {
             const role = getRoleFromCookie();
             if (role === 'teacher') router.push('/teacher');
             else router.push('/');
           }
        } else {
          signOut(auth);
          setUser(null);
           if (!isPublicPath) {
             router.push("/login");
           }
        }
      } else {
        setUser(null);
        if (!isPublicPath) {
          router.push("/login");
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, router, pathname, isPublicPath]);

  if (loading) {
    return <Preloader />;
  }
  
  if (!user && !isPublicPath) {
    return <Preloader />;
  }

  if (user && isPublicPath) {
    const role = getRoleFromCookie();
    if(user === "principal" || role === 'principal') router.push('/principal');
    else if(role === 'teacher') router.push('/teacher');
    else router.push('/');
    return <Preloader />;
  }

  return <>{children}</>;
}
