import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GraduationCap, Bell, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
    title?: string;
    showAvatar?: boolean;
}

export default function Header({ title, showAvatar = true }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-4 border-b bg-card/80 px-4 shadow-sm backdrop-blur-sm sm:px-6">
      <Link href="/" className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <GraduationCap className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl font-headline">
          {title || "Hilton Convent"}
        </h1>
      </Link>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-full" asChild>
          <Link href="/notices">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
          </Link>
        </Button>
        {showAvatar && (
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="hidden items-center gap-3 focus:outline-none md:flex">
                <Avatar className="h-12 w-12">
                    <AvatarImage
                    src="https://picsum.photos/100/100"
                    alt="Student Avatar"
                    data-ai-hint="student avatar"
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
            </DropdownMenuContent>
            </DropdownMenu>
        )}
      </div>
    </header>
  );
}
