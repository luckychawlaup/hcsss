"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User, signOut } from "firebase/auth";
import { app } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
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
          // Immediately sign out unverified users and redirect to login
          signOut(auth);
          router.push("/login");
        }
      } else {
        setUser(null);
        router.push("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, router, pathname]);

  if (loading) {
    return (
        <div className="flex min-h-screen w-full flex-col bg-background p-8">
            <div className="flex items-center justify-between">
                <Skeleton className="h-12 w-48" />
                <Skeleton className="h-12 w-12 rounded-full" />
            </div>
            <div className="mt-8 space-y-6">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-24 w-full" />
                <div className="grid grid-cols-2 gap-6">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        </div>
    );
  }

  // Fallback for principal who doesn't have a firebase user object
  if (!user && !document.cookie.includes("principal-role=true")) {
     // Redirect is handled in the effect, this is a fallback.
    return null;
  }

  return <>{children}</>;
}
