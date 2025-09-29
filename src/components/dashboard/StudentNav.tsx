
"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, CalendarPlus, User, BookOpen, Wallet, Book } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import BottomNav from "./BottomNav";
import Link from "next/link";

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
      <div className="hidden md:flex flex-col gap-4 border-r bg-background p-4 w-64">
          <p className="font-semibold text-lg px-2">Navigation</p>
          <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                  <Button
                      key={item.label}
                      variant={pathname === item.href ? "secondary" : "ghost"}
                      onClick={() => handleNavigation(item.href)}
                      className="justify-start"
                  >
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.label}
                  </Button>
              ))}
                <Link href="https://ncert.nic.in/textbook.php" target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" className="justify-start w-full">
                        <Book className="mr-2 h-4 w-4" />
                        Online Textbooks
                    </Button>
                </Link>
          </nav>
      </div>
  );
}
