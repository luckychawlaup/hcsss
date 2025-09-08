import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GraduationCap } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card/80 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold text-foreground font-headline">
          Hilton Convent School
        </h1>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <div className="text-right">
          <p className="font-semibold">Siddharth Sharma</p>
          <p className="text-sm text-muted-foreground">Class 10 - A</p>
        </div>
        <Avatar>
          <AvatarImage
            src="https://picsum.photos/100/100"
            alt="Student Avatar"
            data-ai-hint="student avatar"
            width={100}
            height={100}
          />
          <AvatarFallback>SS</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
