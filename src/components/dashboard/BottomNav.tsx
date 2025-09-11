
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, CalendarPlus, LifeBuoy, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuth, signOut } from "firebase/auth";
import { app } from "@/lib/firebase";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/leave", label: "Leave", icon: CalendarPlus },
  { href: "/help", label: "Help", icon: LifeBuoy },
  { href: "/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = getAuth(app);

  const handleLogout = async () => {
    await signOut(auth);
    document.cookie = "teacher-role=; path=/; max-age=-1";
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
                "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
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
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
}
