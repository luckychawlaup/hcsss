
"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Bell, LogOut, User as UserIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSchoolInfo } from "@/hooks/use-school-info";
import { Skeleton } from "../ui/skeleton";
import { useState, useEffect } from "react";
import { getStudentByAuthId } from "@/lib/supabase/students";
import type { Student } from "@/lib/supabase/students";
import { ThemeToggleButton } from "../ui/theme-toggle-button";


interface HeaderProps {
    title?: string;
    showAvatar?: boolean;
}

function WelcomeMessage({ user }) {
  const [student, setStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (user) {
      getStudentByAuthId(user.id).then(setStudent);
    }
  }, [user]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  if (!student) {
    return <Skeleton className="h-5 w-40" />;
  }

  return (
    <h1 className="text-lg font-bold text-foreground sm:text-xl font-headline truncate">
      {getGreeting()}, {student.name.split(' ')[0]}!
    </h1>
  );
}


export default function Header({ title, showAvatar = true }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const isTeacher = pathname.startsWith('/teacher');
  const isPrincipal = pathname.startsWith('/principal');
  const isOwner = pathname.startsWith('/owner');
  const { schoolInfo } = useSchoolInfo();

  const [user, setUser] = useState(null);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );
    return () => authListener.subscription.unsubscribe();
  }, [supabase]);


  const noticesLink = isTeacher ? "/teacher/notices" : "/notices";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  }


  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-card/80 px-4 shadow-sm backdrop-blur-sm sm:px-6">
       <div className="flex items-center gap-3">
        <Link href="/" className="flex-shrink-0">
            <Image src="/hcsss.png" alt="School Logo" width={40} height={40} />
        </Link>
        <div>
            {pathname === '/' && user ? <WelcomeMessage user={user} /> : (
                <h1 className="text-lg font-bold text-foreground sm:text-xl font-headline truncate">
                {title || (schoolInfo?.name ?? "HCSSS")}
                </h1>
            )}
            {pathname === '/' && user && <p className="text-xs text-muted-foreground">{schoolInfo?.name}</p>}
        </div>
       </div>
      <div className="flex items-center gap-1">
        {!isPrincipal && !isOwner && (
          <Button variant="ghost" size="icon" className="rounded-full" asChild>
            <Link href={noticesLink}>
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Link>
          </Button>
        )}
        <ThemeToggleButton />
        {(isPrincipal || isOwner) && (
            <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
            </Button>
        )}
      </div>
    </header>
  );
}
