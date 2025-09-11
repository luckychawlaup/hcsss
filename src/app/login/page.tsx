
import Link from "next/link";
import Image from "next/image";
import { User, Briefcase, School } from "lucide-react";

export default function RoleSelectionPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-12">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary-foreground mb-4">
            <Image src="/logo.png" alt="Hilton Convent School Logo" width={80} height={80} />
          </div>
          <h1 className="text-3xl font-bold text-center text-primary">Hilton Convent School</h1>
          <p className="text-center text-muted-foreground mt-2">
            Welcome! Please select your role to continue.
          </p>
        </div>
        
        <div className="space-y-4">
            <Link href="/auth/student/login" className="block">
                <div className="flex items-center gap-4 rounded-lg border p-4 hover:bg-accent hover:text-accent-foreground transition-colors">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <User className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-lg">I am a Student</h2>
                        <p className="text-sm text-muted-foreground">Sign in to your dashboard.</p>
                    </div>
                </div>
            </Link>
             <Link href="/auth/teacher/login" className="block">
                <div className="flex items-center gap-4 rounded-lg border p-4 hover:bg-accent hover:text-accent-foreground transition-colors">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Briefcase className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-lg">I am a Teacher</h2>
                        <p className="text-sm text-muted-foreground">Access your teacher portal.</p>
                    </div>
                </div>
            </Link>
             <Link href="/auth/principal/login" className="block">
                <div className="flex items-center gap-4 rounded-lg border p-4 hover:bg-accent hover:text-accent-foreground transition-colors">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <School className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-lg">I am the Principal</h2>
                        <p className="text-sm text-muted-foreground">Access the admin dashboard.</p>
                    </div>
                </div>
            </Link>
        </div>
      </div>
    </div>
  );
}
