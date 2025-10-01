
"use client";

import { useState, useEffect } from "react";
import { User as AuthUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getStudentByAuthId } from "@/lib/supabase/students";
import { getTeacherByAuthId } from "@/lib/supabase/teachers";
import type { Student } from "@/lib/supabase/students";
import type { Teacher } from "@/lib/supabase/teachers";
import { ProfileSkeleton, StudentProfile, TeacherProfile, StudentProfileDetails, TeacherProfileDetails } from "./ProfileDetails";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import { LogOut, ChevronRight, MessageSquareQuote, Shield, FileText, Info, Users, Eye, Receipt, Mail } from "lucide-react";
import BottomNav from "../dashboard/BottomNav";
import TeacherNav from "../teacher/TeacherNav";
import Link from "next/link";
import { getRole } from "@/lib/getRole";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { UpdateEmailForm } from "./UpdateEmailForm";

const ProfileLink = ({ href, icon: Icon, title, description }: { href: string; icon: React.ElementType; title: string; description: string; }) => (
    <Link href={href} className="block w-full text-left">
        <div className="flex items-center gap-4 rounded-lg p-3 transition-all duration-200 hover:bg-accent/50">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
                <h2 className="text-md font-semibold text-foreground">{title}</h2>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
    </Link>
)

export default function ProfilePageContent() {
  const [profile, setProfile] = useState<Student | Teacher | null>(null);
  const [role, setRole] = useState<"student" | "teacher" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(true);
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const userRole = await getRole(user);
        setRole(userRole as "student" | "teacher" | null);

        try {
          if (userRole === 'teacher') {
            const teacherProfile = await getTeacherByAuthId(user.id);
            setProfile(teacherProfile);
          } else if (userRole === 'student') {
            const studentProfile = await getStudentByAuthId(user.id);
            setProfile(studentProfile);
          } else {
            setProfile(null);
          }
        } catch (error) {
          console.error("Failed to fetch profile:", error);
          setProfile(null);
          setRole(null);
        }
      } else {
        setProfile(null);
        setRole(null);
        router.push("/login");
      }
      setIsLoading(false);
    };
    
    fetchProfile();
  }, [supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const toggleDetails = () => {
      setShowDetails(prev => !prev);
  }

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-96 p-4 text-center">
        <p className="text-muted-foreground">
          Could not load user profile. Please try again later.
        </p>
      </div>
    );
  }
  
  const profileHeader = role === "teacher" 
    ? <TeacherProfile teacher={profile as Teacher} /> 
    : <StudentProfile student={profile as Student} />;
    
  const profileDetails = role === "teacher" 
    ? <TeacherProfileDetails teacher={profile as Teacher} user={user} />
    : <StudentProfileDetails student={profile as Student} user={user} />;

  return (
    <>
      <div className="pb-20 md:pb-0">
        <div onClick={toggleDetails} className="cursor-pointer">
            {profileHeader}
        </div>
        
        <div className="p-4 sm:p-6 lg:p-8 space-y-4">
             {showDetails && profileDetails}

             <Card>
                <CardContent className="p-2">
                    <ProfileLink href="/feedback" icon={MessageSquareQuote} title="Complaint & Feedback" description="Submit your queries or suggestions" />
                    <ProfileLink href="/about" icon={Users} title="About Us" description="Learn more about our school" />
                    <ProfileLink href="/help" icon={Info} title="Help & FAQ" description="Find answers to common questions" />
                </CardContent>
            </Card>

             <Card>
                <CardContent className="p-2">
                    <ProfileLink href="/terms" icon={FileText} title="Terms & Conditions" description="Our school's usage policies" />
                    <ProfileLink href="/privacy" icon={Shield} title="Privacy Policy" description="How we handle your data" />
                    <ProfileLink href="/refund-policy" icon={Receipt} title="Return & Refund Policy" description="Information on fee refunds" />
                </CardContent>
            </Card>

            <Button variant="destructive" className="w-full" onClick={handleLogout}>
                <LogOut className="mr-2"/>
                Logout
            </Button>
        </div>
      </div>

      {/* Render correct navigation based on role */}
      {role === "teacher" && <TeacherNav activeView="profile" setActiveView={() => {}} teacherRole={teacher?.role} />}
      {role === "student" && <BottomNav />}
    </>
  );
}
