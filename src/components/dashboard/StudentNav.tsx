
"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, CalendarPlus, User, Wallet, Book } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import BottomNav from "./BottomNav";

export default function StudentNav() {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return <BottomNav />;
  }

  // Desktop navigation is now part of the main dashboard layout, so this component only needs to render the mobile bottom nav.
  return null;
}
