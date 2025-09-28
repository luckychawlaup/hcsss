
"use client";

import { useRouter, usePathname } from "next/navigation";
import { Home, ClipboardCheck, BookUp, User, Camera, Megaphone, CalendarPlus, BookMarked, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { TeacherView } from "./TeacherDashboard";
import { useIsMobile } from "@/hooks/use-mobile";

interface NavItem {
  view: TeacherView | "profile" | "gallery" | "teacherLeave" | "gradebook";
  label: string;
  icon: React.ElementType;
  href?: string;
  classTeacherOnly?: boolean;
}

const mainNavItems: NavItem[] = [
  { view: "dashboard", label: "Home", icon: Home, href: "/teacher" },
  { view: "addHomework", label: "Homework", icon: BookUp },
  { view: "markAttendance", label: "Attendance", icon: UserCheck, classTeacherOnly: true },
  { view: "gradebook", label: "Gradebook", icon: BookMarked, classTeacherOnly: true },
  { view: "teacherLeave", label: "Leave", icon: CalendarPlus },
  { view: "makeAnnouncement", label: "Announce", icon: Megaphone, href: "/teacher/announcements" },
  { view: "profile", label: "Profile", icon: User, href: "/profile" },
];

const mobileNavItems: NavItem[] = [
  { view: "dashboard", label: "Home", icon: Home, href: "/teacher" },
  { view: "addHomework", label: "Homework", icon: BookUp },
  { view: "teacherLeave", label: "Leave", icon: CalendarPlus },
  { view: "profile", label: "Profile", icon: User, href: "/profile" },
];

interface TeacherNavProps {
    activeView: TeacherView | "profile" | "gallery" | "teacherLeave";
    setActiveView: (view: TeacherView) => void;
    teacherRole?: "classTeacher" | "subjectTeacher";
}

export default function TeacherNav({ activeView, setActiveView, teacherRole }: TeacherNavProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const pathname = usePathname();

  const handleNavigation = (item: NavItem) => {
      if (item.href) {
          router.push(item.href);
      } else {
          if (pathname !== '/teacher') {
            router.push('/teacher');
            setTimeout(() => setActiveView(item.view as TeacherView), 50);
          } else {
            setActiveView(item.view as TeacherView);
          }
      }
  }
  
  const getIsActive = (item: NavItem) => {
      if (item.href) {
          return pathname === item.href;
      }
      return activeView === item.view && pathname === '/teacher';
  }
  
  const filteredMainNavItems = mainNavItems.filter(item => {
    if (item.classTeacherOnly) {
      return teacherRole === 'classTeacher';
    }
    return true;
  });

  if (isMobile) {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur-sm md:hidden">
            <div className="grid h-16 grid-cols-4 items-center justify-items-center">
                {mobileNavItems.map(item => {
                    const isActive = getIsActive(item);
                    return (
                        <button
                            key={item.label}
                            onClick={() => handleNavigation(item)}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors w-full h-full",
                                isActive
                                ? "text-primary"
                                : "text-muted-foreground hover:text-primary"
                            )}
                            >
                            <item.icon className="h-5 w-5" />
                            <span>{item.label}</span>
                        </button>
                    )
                })}
            </div>
        </nav>
    )
  }

  return (
    <nav className="hidden md:flex flex-col gap-4 border-r bg-background min-w-[220px] max-w-[280px] p-4">
        <div className="flex-1">
             <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Main Menu</p>
            <div className="grid items-start gap-1">
                {filteredMainNavItems.map((item) => {
                     const isActive = getIsActive(item);
                    return (
                        <Button
                            key={item.label}
                            variant={isActive ? "secondary" : "ghost"}
                            className="justify-start"
                            onClick={() => handleNavigation(item)}
                        >
                            <item.icon className="mr-2 h-4 w-4" />
                            {item.label}
                        </Button>
                    );
                })}
            </div>
        </div>
    </nav>
  );
}
