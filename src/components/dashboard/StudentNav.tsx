
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
  
  // The sidebar is removed for desktop, always render the mobile bottom nav.
  return <BottomNav />;
}
