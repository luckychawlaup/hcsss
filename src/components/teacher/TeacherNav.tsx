
"use client";

import { useRouter, usePathname } from "next/navigation";
import { Home, ClipboardCheck, BookUp, User, Camera, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { TeacherView } from "./TeacherDashboard";
import { useIsMobile } from "@/hooks/use-mobile";

interface NavItem {
  view: TeacherView | "profile" | "gallery";
  label: string;
  icon: React.ElementType;
}

const mainNavItems: NavItem[] = [
  { view: "dashboard", label: "Home", icon: Home },
  { view: "markAttendance", label: "Attendance", icon: ClipboardCheck },
  { view: "addHomework", label: "Homework", icon: BookUp },
  { view: "gallery", label: "Gallery", icon: Camera },
  { view: "profile", label: "Profile", icon: User },
];

interface TeacherNavProps {
    activeView: TeacherView | "profile" | "gallery";
    setActiveView: (view: TeacherView) => void;
}

export default function TeacherNav({ activeView, setActiveView }: TeacherNavProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const pathname = usePathname();

  const handleNavigation = (view: TeacherView | "profile" | "gallery") => {
      if (view === 'profile') {
          router.push('/profile');
      } else if (view === 'gallery') {
          router.push('/gallery');
      } else {
          if (pathname !== '/teacher') {
            router.push('/teacher');
            // A slight delay to allow router to push first, then set the view
            setTimeout(() => setActiveView(view), 50);
          } else {
            setActiveView(view);
          }
      }
  }
  
  if (isMobile) {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur-sm md:hidden">
            <div className="grid h-16 grid-cols-5 items-center justify-items-center">
                {mainNavItems.map(item => {
                    const isActive = item.view === 'profile' ? pathname === '/profile' : item.view === 'gallery' ? pathname === '/gallery' : activeView === item.view && pathname === '/teacher';
                    return (
                        <button
                            key={item.label}
                            onClick={() => handleNavigation(item.view)}
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
                {mainNavItems.map((item) => {
                     const isActive = item.view === 'profile' ? pathname === '/profile' : item.view === 'gallery' ? pathname === '/gallery' : activeView === item.view && pathname === '/teacher';
                    return (
                        <Button
                            key={item.label}
                            variant={isActive ? "secondary" : "ghost"}
                            className="justify-start"
                            onClick={() => handleNavigation(item.view)}
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
