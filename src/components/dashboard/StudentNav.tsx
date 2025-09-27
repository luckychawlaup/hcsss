
"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, CalendarPlus, User, BookOpen, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import BottomNav from "./BottomNav";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/homework", label: "Homework", icon: BookOpen },
  { href: "/fees", label: "Fees", icon: Wallet },
  { href: "/leave", label: "Leave", icon: CalendarPlus },
  { href: "/profile", label: "Profile", icon: User },
];

export default function StudentNav() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const pathname = usePathname();

  const handleNavigation = (href: string) => {
      router.push(href);
  }
  
  if (isMobile) {
    return <BottomNav />;
  }

  return (
    <nav className="hidden md:flex flex-col gap-4 border-r bg-background min-w-[220px] max-w-[280px] p-4">
        <div className="flex-1">
             <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Main Menu</p>
            <div className="grid items-start gap-1">
                {navItems.map((item) => {
                     const isActive = pathname === item.href;
                    return (
                        <Button
                            key={item.label}
                            variant={isActive ? "secondary" : "ghost"}
                            className="justify-start"
                            onClick={() => handleNavigation(item.href)}
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
