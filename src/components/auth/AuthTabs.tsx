"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoginForm from "@/components/auth/LoginForm";
import Link from "next/link";

export default function AuthTabs() {
  return (
    <Tabs defaultValue="student" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="student">Student</TabsTrigger>
        <TabsTrigger value="teacher">Teacher</TabsTrigger>
        <TabsTrigger value="principal">Principal</TabsTrigger>
      </TabsList>
      <TabsContent value="student">
        <div className="pt-8">
            <LoginForm role="student" />
            <p className="mt-4 text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/signup" className="font-medium text-primary hover:underline">
                Sign up
                </Link>
            </p>
        </div>
      </TabsContent>
      <TabsContent value="teacher">
        <div className="pt-8">
          <LoginForm role="teacher" />
           <p className="mt-4 text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/signup/teacher" className="font-medium text-primary hover:underline">
                Sign up
                </Link>
            </p>
        </div>
      </TabsContent>
      <TabsContent value="principal">
         <div className="pt-8">
            <LoginForm role="principal" />
        </div>
      </TabsContent>
    </Tabs>
  );
}
