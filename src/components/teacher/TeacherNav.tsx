
"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Home, User, BookUp, ClipboardCheck, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { TeacherView } from "./TeacherDashboard";

interface NavItem {
  view?: TeacherView;
  href?: string;
  label: string;
  icon: React.ElementType;
}

const mainNavItems: NavItem[] = [
  { view: "dashboard", label: "Home", icon: Home },
  { view: "markAttendance", label: "Attendance", icon: ClipboardCheck },
  { view: "addHomework", label: "Homework", icon: BookUp },
  { href: "/profile", label: "Profile", icon: User },
];

interface TeacherNavProps {
    activeView: TeacherView;
    setActiveView: (view: TeacherView) => void;
}

export default function TeacherNav({ activeView, setActiveView }: TeacherNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <>
        {/* Sidebar for Desktop */}
        <nav className="hidden md:flex flex-col gap-4 border-r bg-background min-w-[220px] max-w-[280px] p-4">
            <div className="flex-1">
                 <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Main Menu</p>
                <div className="grid items-start gap-1">
                    {mainNavItems.map((item) => {
                        const isActive = item.view ? activeView === item.view : pathname === item.href;
                        return (
                            <Button
                                key={item.label}
                                variant={isActive ? "secondary" : "ghost"}
                                className="justify-start"
                                onClick={() => {
                                    if(item.view) setActiveView(item.view);
                                    if(item.href) router.push(item.href);
                                }}
                            >
                                <item.icon className="mr-2 h-4 w-4" />
                                {item.label}
                            </Button>
                        );
                    })}
                </div>
            </div>
        </nav>
        
        {/* Bottom Nav for Mobile */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur-sm md:hidden">
            <div className="grid h-16 grid-cols-4 items-center justify-items-center">
                {mainNavItems.map(item => {
                    const isActive = item.view ? activeView === item.view : pathname === item.href;
                    return (
                        <button
                            key={item.label}
                            onClick={() => {
                                if(item.view) setActiveView(item.view);
                                if(item.href) router.push(item.href);
                            }}
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
    </>
  );
}
