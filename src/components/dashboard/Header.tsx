import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GraduationCap, Bell } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-4 border-b bg-card/80 px-4 shadow-sm backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <GraduationCap className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl font-headline">
          Hilton Convent School
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </Button>
        <div className="text-right hidden sm:block">
          <p className="font-semibold">Siddharth Sharma</p>
          <p className="text-sm text-muted-foreground">Class 10 - A</p>
        </div>
        <Avatar className="h-12 w-12">
          <AvatarImage
            src="https://picsum.photos/100/100"
            alt="Student Avatar"
            data-ai-hint="student avatar"
          />
          <AvatarFallback>SS</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
