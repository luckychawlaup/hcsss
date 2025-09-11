
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
import { getAuth, signOut } from "firebase/auth";
import { app } from "@/lib/firebase";


interface HeaderProps {
    title?: string;
    showAvatar?: boolean;
}

export default function Header({ title, showAvatar = true }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = getAuth(app);
  const isTeacher = pathname.startsWith('/teacher');
  const isPrincipal = pathname.startsWith('/principal');

  // Determine notification link based on role
  const noticesLink = isTeacher ? "/teacher/announcements" : "/notices";

  const handleLogout = async () => {
    if(isPrincipal) {
        document.cookie = "principal-role=; path=/; max-age=-1";
    } else {
        await signOut(auth);
        document.cookie = "teacher-role=; path=/; max-age=-1";
    }
    router.push("/login");
    router.refresh();
  }


  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-4 border-b bg-card/80 px-4 shadow-sm backdrop-blur-sm sm:px-6">
      <Link href="/" className="flex items-center gap-3">
        <Image src="https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hiltonconventschool_logo.png" alt="Hilton Convent School Logo" width={56} height={56} />
        <h1 className="text-xl font-bold text-foreground sm:text-2xl font-headline">
          {title || "Hilton Convent"}
        </h1>
      </Link>
      <div className="flex items-center gap-2">
        {!isPrincipal && (
          <Button variant="ghost" size="icon" className="rounded-full" asChild>
            <Link href={noticesLink}>
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Link>
          </Button>
        )}
        {showAvatar && (
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="hidden items-center gap-3 focus:outline-none md:flex">
                <Avatar className="h-12 w-12">
                    <AvatarImage
                    src="https://picsum.photos/100/100"
                    alt="User Avatar"
                    data-ai-hint="teacher avatar"
                    />
                    <AvatarFallback>SS</AvatarFallback>
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
        {isPrincipal && (
            <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
            </Button>
        )}
      </div>
    </header>
  );
}
