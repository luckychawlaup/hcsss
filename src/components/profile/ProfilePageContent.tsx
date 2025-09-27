
"use client";

import { useState, useEffect } from "react";
import { User as AuthUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getStudentByAuthId } from "@/lib/supabase/students";
import { getTeacherByAuthId } from "@/lib/supabase/teachers";
import type { Student } from "@/lib/supabase/students";
import type { Teacher } from "@/lib/supabase/teachers";
import { ProfileSkeleton, StudentProfile, TeacherProfile } from "./ProfileDetails";
import { SalaryDetails } from "../teacher/SalaryDetails";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import BottomNav from "../dashboard/BottomNav";
import TeacherNav from "../teacher/TeacherNav";

export default function ProfilePageContent() {
  const [profile, setProfile] = useState<Student | Teacher | null>(null);
  const [role, setRole] = useState<"student" | "teacher" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsLoading(true);
      const user = session?.user;
      if (user) {
        try {
          const teacherProfile = await getTeacherByAuthId(user.id);
          if (teacherProfile) {
            setProfile(teacherProfile);
            setRole("teacher");
          } else {
            const studentProfile = await getStudentByAuthId(user.id);
            if (studentProfile) {
              setProfile(studentProfile);
              setRole("student");
            } else {
              setProfile(null);
              setRole(null);
            }
          }
        } catch (error) {
          console.error("Failed to fetch profile:", error);
          setProfile(null);
          setRole(null);
        } finally {
          setIsLoading(false);
        }
      } else {
        setProfile(null);
        setRole(null);
        setIsLoading(false);
        router.push("/login");
      }
    });

    return () => {
        authListener.subscription.unsubscribe();
    };
  }, [supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

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

  return (
    <>
      <div className="pb-20 md:pb-0">
        {role === "teacher" && <TeacherProfile teacher={profile as Teacher} />}
        {role === "student" && <StudentProfile student={profile as Student} />}

        {role === 'teacher' && (
          <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <SalaryDetails teacher={profile as Teacher} />
          </div>
        )}
        
        <div className="px-4 sm:px-6 lg:px-8 mt-8">
            <Button variant="outline" className="w-full" onClick={handleLogout}>
                <LogOut className="mr-2"/>
                Logout
            </Button>
        </div>
      </div>

      {/* Render correct navigation based on role */}
      {role === "teacher" && <TeacherNav activeView="profile" setActiveView={() => {}} />}
      {role === "student" && <BottomNav />}
    </>
  );
}
