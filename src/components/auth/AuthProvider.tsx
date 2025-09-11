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
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                    <Image src="/logo.png" alt="Hilton Convent School Logo" width={80} height={80} />
                </div>
                <h1 className="text-2xl font-bold text-primary">Hilton Convent School</h1>
                <p className="text-muted-foreground">Loading, please wait...</p>
                 <Skeleton className="h-2 w-48 mt-4" />
            </div>
        </div>
    );
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

  const isPublicPath = publicPaths.includes(pathname);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoading(true);
      // Check for hardcoded principal login first
      const isPrincipal = document.cookie.includes("principal-role=true");
      if (isPrincipal) {
        setUser({} as User); // Set a dummy user object for principal
        setLoading(false);
        return;
      }

      if (user) {
        if (user.emailVerified) {
          setUser(user);
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
     // Redirect is handled in the effect, this is a fallback.
    return <Preloader />;
  }
  
  if (user && isPublicPath) {
    const isPrincipal = document.cookie.includes("principal-role=true");
    const isTeacher = document.cookie.includes("teacher-role=true");
    if(isPrincipal) router.push('/principal');
    else if(isTeacher) router.push('/teacher');
    else router.push('/');
    return <Preloader />;
  }


  return <>{children}</>;
}
