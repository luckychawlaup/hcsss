
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { User, Briefcase, School, Calculator, ClipboardSignature, FilePenLine } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export default function RoleSelectionPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [logoClickCount, setLogoClickCount] = useState(0);
  
  const handleFeatureComingSoon = () => {
    toast({
      title: "Feature Not Available",
      description: "This feature is not live yet but will be in a future update.",
    });
  };

  const handleLogoClick = () => {
    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);
    if (newCount >= 5) {
      router.push('/auth/owner/login');
    }
  };

  const RoleCard = ({ href, icon: Icon, title, description }: { href: string; icon: React.ElementType; title: string; description: string }) => (
    <Link href={href} className="block">
      <div className="flex flex-col items-center justify-center text-center gap-2 rounded-lg border p-4 transition-all duration-200 hover:border-primary/50 hover:bg-accent/50 h-full">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-md font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </Link>
  );

  const ActionCard = ({ icon: Icon, title, description, onClick }: { icon: React.ElementType; title: string; description: string, onClick?: () => void }) => (
     <button onClick={onClick} className="block w-full text-left">
        <div className="flex items-center gap-4 rounded-lg border p-3 transition-all duration-200 hover:border-primary/50 hover:bg-accent/50">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <h2 className="text-md font-semibold text-foreground">{title}</h2>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
        </div>
    </button>
  )

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
      <div className="flex w-full max-w-lg flex-1 flex-col justify-center">
        <div className="mb-8 flex flex-col items-center justify-center">
          <button onClick={handleLogoClick} className="cursor-pointer rounded-full">
            <Image src="/hcsss.png" alt="School Logo" width={90} height={90} className="rounded-full" priority />
          </button>
           <div className="flex items-center gap-2 mt-4">
            <h1 className="text-center text-3xl font-bold text-primary">HCSSS</h1>
            <Badge variant="outline" className="border-primary/50 text-primary">Beta</Badge>
          </div>
          <p className="mt-2 text-center text-muted-foreground">
            Welcome! Please select your role to sign in.
          </p>
        </div>
        
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <RoleCard href="/auth/student/login" icon={User} title="Student" description="Student Portal" />
                <RoleCard href="/auth/teacher/login" icon={Briefcase} title="Teacher" description="Teacher Portal" />
                <RoleCard href="/auth/principal/login" icon={School} title="Principal" description="Admin Dashboard" />
                <RoleCard href="/auth/accountant/login" icon={Calculator} title="Accountant" description="Accounts Dept." />
            </div>
          </CardContent>
        </Card>
        
        <div className="my-6 flex items-center">
            <span className="px-4 text-sm text-muted-foreground">OR</span>
            <Separator className="flex-1" />
        </div>

        <div className="w-full space-y-4">
           <ActionCard onClick={handleFeatureComingSoon} icon={FilePenLine} title="Apply for Admission" description="entrance exam needs to be passed" />
           <ActionCard onClick={handleFeatureComingSoon} icon={ClipboardSignature} title="Apply for Teaching Post" description="interview needs to be passed" />
        </div>
      </div>
    </div>
  );
}
