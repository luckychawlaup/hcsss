
"use client";

import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged, signOut, User as AuthUser } from "firebase/auth";
import { app } from "@/lib/firebase";
import { getStudentByAuthId } from "@/lib/firebase/students";
import { getTeacherByAuthId } from "@/lib/firebase/teachers";
import type { Student } from "@/lib/firebase/students";
import type { Teacher } from "@/lib/firebase/teachers";
import { Skeleton } from "@/components/ui/skeleton";
import ProfileDetails from "./ProfileDetails";
import { SalaryDetails } from "../teacher/SalaryDetails";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Wallet, LogOut } from "lucide-react";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";

function ProfileSkeleton() {
  return (
    <div className="w-full p-4">
      <div className="bg-card p-6 text-center">
        <Skeleton className="h-24 w-24 mx-auto rounded-full border-4 border-background shadow-lg" />
        <Skeleton className="h-7 w-40 mt-4 mx-auto" />
        <Skeleton className="h-4 w-56 mt-2 mx-auto" />
      </div>
      <div className="px-2 py-4 md:px-4 md:py-6 space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}

export default function ProfilePageContent() {
  const [profile, setProfile] = useState<Student | Teacher | null>(null);
  const [role, setRole] = useState<"student" | "teacher" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const auth = getAuth(app);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: AuthUser | null) => {
      setIsLoading(true);
      if (user) {
        try {
          const teacherProfile = await getTeacherByAuthId(user.uid);
          if (teacherProfile) {
            setProfile(teacherProfile);
            setRole("teacher");
          } else {
            const studentProfile = await getStudentByAuthId(user.uid);
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
      }
    });

    return () => unsubscribe();
  }, [auth]);

  const handleLogout = async () => {
    await signOut(auth);
    document.cookie = "teacher-role=; path=/; max-age=-1";
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

  if (role === "teacher") {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">
              <User className="mr-2" />
              Personal Details
            </TabsTrigger>
            <TabsTrigger value="salary">
              <Wallet className="mr-2" />
              Salary & Payroll
            </TabsTrigger>
          </TabsList>
          <TabsContent value="details">
            <ProfileDetails profile={profile as Teacher} role="teacher" isLoading={false} />
          </TabsContent>
          <TabsContent value="salary">
            <SalaryDetails teacher={profile as Teacher} />
          </TabsContent>
        </Tabs>
         <div className="mt-8">
            <Button variant="outline" className="w-full" onClick={handleLogout}>
                <LogOut className="mr-2"/>
                Logout
            </Button>
        </div>
      </div>
    );
  }

  if (role === "student") {
    return <ProfileDetails profile={profile as Student} role="student" isLoading={false} />;
  }

  return (
    <div className="flex items-center justify-center h-96 p-4 text-center">
      <p className="text-muted-foreground">
        Your profile could not be loaded. Please contact administration.
      </p>
    </div>
  );
}
