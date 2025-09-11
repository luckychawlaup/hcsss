
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, User, LifeBuoy, LogOut, LayoutDashboard, Users, CalendarCheck, BookUp, ClipboardCheck, CalendarPlus, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuth, signOut } from "firebase/auth";
import { app } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import type { TeacherView } from "./TeacherDashboard";

interface NavItem {
  view: TeacherView;
  label: string;
  icon: React.ElementType;
  href?: string;
}

const navItems: NavItem[] = [
  { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { view: "manageStudents", label: "My Students", icon: Users },
  { view: "approveLeaves", label: "Approve Leaves", icon: CalendarCheck },
  { view: "addHomework", label: "Homework", icon: BookUp },
  { view: "markAttendance", label: "Attendance", icon: ClipboardCheck },
  { view: "applyLeave", label: "Apply Leave", icon: CalendarPlus },
  { view: "salary", label: "Salary", icon: DollarSign },
];

const secondaryNavItems = [
    { href: "/profile", label: "Profile", icon: User },
    { href: "/help", label: "Help & Support", icon: LifeBuoy },
]

interface TeacherNavProps {
    activeView: TeacherView;
    setActiveView: (view: TeacherView) => void;
}

export default function TeacherNav({ activeView, setActiveView }: TeacherNavProps) {
  const router = useRouter();
  const auth = getAuth(app);
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut(auth);
    document.cookie = "teacher-role=; path=/; max-age=-1";
    router.push("/login");
  };
  
  const handleNavClick = (view: TeacherView, href?: string) => {
      if (href) {
          router.push(href);
      } else {
          setActiveView(view);
      }
  }

  return (
    <>
        {/* Sidebar for Desktop */}
        <nav className="hidden md:flex flex-col gap-4 border-r bg-background min-w-[220px] max-w-[280px] p-4">
            <div className="flex-1">
                 <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Main Menu</p>
                <div className="grid items-start gap-1">
                    {navItems.map((item) => {
                    const isActive = activeView === item.view;
                    return (
                        <Button
                            key={item.label}
                            variant={isActive ? "secondary" : "ghost"}
                            className="justify-start"
                            onClick={() => handleNavClick(item.view, item.href)}
                        >
                            <item.icon className="mr-2 h-4 w-4" />
                            {item.label}
                        </Button>
                    );
                    })}
                </div>
                 <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6 mb-2">General</p>
                 <div className="grid items-start gap-1">
                    {secondaryNavItems.map((item) => (
                         <Link href={item.href} key={item.label}>
                            <Button
                                variant={pathname === item.href ? "secondary" : "ghost"}
                                className="w-full justify-start"
                            >
                                <item.icon className="mr-2 h-4 w-4" />
                                {item.label}
                            </Button>
                         </Link>
                    ))}
                 </div>
            </div>
            <div>
                 <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={handleLogout}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                </Button>
            </div>
        </nav>
        
        {/* Bottom Nav for Mobile */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur-sm md:hidden">
            <div className="grid h-16 grid-cols-5 items-center justify-items-center">
                <button
                    onClick={() => setActiveView("dashboard")}
                    className={cn(
                        "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                        activeView === 'dashboard'
                        ? "text-primary"
                        : "text-muted-foreground hover:text-primary"
                    )}
                    >
                    <Home className="h-5 w-5" />
                    <span>Home</span>
                </button>
                 <Link
                    href="/profile"
                    className={cn(
                        "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                        pathname === '/profile'
                        ? "text-primary"
                        : "text-muted-foreground hover:text-primary"
                    )}
                    >
                    <User className="h-5 w-5" />
                    <span>Profile</span>
                </Link>
                 <Link
                    href="/help"
                    className={cn(
                        "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                         pathname === '/help'
                        ? "text-primary"
                        : "text-muted-foreground hover:text-primary"
                    )}
                    >
                    <LifeBuoy className="h-5 w-5" />
                    <span>Help</span>
                </Link>
                 <button
                    onClick={handleLogout}
                    className="flex flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                </button>
            </div>
        </nav>
    </>
  );
}
