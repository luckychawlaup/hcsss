
"use client";

import Link from "next/link";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bell, User, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface HeaderProps {
    title?: string;
    showAvatar?: boolean;
}

export default function Header({ title, showAvatar = true }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const isTeacher = pathname.startsWith('/teacher');
  const isPrincipal = pathname.startsWith('/principal');
  const isOwner = pathname.startsWith('/owner');

  // Determine notification link based on role
  const noticesLink = isTeacher ? "/teacher/notices" : "/notices";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  }


  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-card/80 px-4 shadow-sm backdrop-blur-sm sm:px-6">
      <Link href="/" className="flex items-center gap-3">
        <Image src="/hcsss.png" alt="School Logo" width={40} height={40} />
        <h1 className="text-lg font-bold text-foreground sm:text-xl font-headline truncate">
          {title || "HCSSS"}
        </h1>
      </Link>
      <div className="flex items-center gap-1">
        {!isPrincipal && !isOwner && (
          <Button variant="ghost" size="icon" className="rounded-full" asChild>
            <Link href={noticesLink}>
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Link>
          </Button>
        )}
        {showAvatar && !isPrincipal && !isOwner && (
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="focus:outline-none">
                <Avatar className="h-9 w-9">
                    <AvatarImage
                    src={`https://api.dicebear.com/8.x/initials/svg?seed=${title}`}
                    alt="User Avatar"
                    />
                    <AvatarFallback>U</AvatarFallback>
                </Avatar>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/profile" passHref>
                <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                </DropdownMenuItem>
                </Link>
                 <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
        )}
        {(isPrincipal || isOwner) && (
            <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
            </Button>
        )}
      </div>
    </header>
  );
}
