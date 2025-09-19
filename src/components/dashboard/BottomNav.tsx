
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, CalendarPlus, LifeBuoy, User, LogOut, MessageSquareQuote, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuth, signOut } from "firebase/auth";
import { app } from "@/lib/firebase";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/leave", label: "Leave", icon: CalendarPlus },
  { href: "/gallery", label: "Gallery", icon: Camera },
  { href: "/feedback", label: "Feedback", icon: MessageSquareQuote },
  { href: "/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = getAuth(app);

  const handleLogout = async () => {
    await signOut(auth);
    document.cookie = "teacher-role=; path=/; max-age=-1";
    document.cookie = "owner-role=; path=/; max-age=-1";
    router.push("/login");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur-sm md:hidden">
      <div className="grid h-16 grid-cols-5 items-center justify-items-center">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors w-full h-full",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
