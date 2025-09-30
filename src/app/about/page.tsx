
"use client";
import Header from "@/components/dashboard/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Building, Target, BookOpen, Mail, Bot } from "lucide-react";
import Image from "next/image";
import { useSchoolInfo } from "@/hooks/use-school-info";
import { Skeleton } from "@/components/ui/skeleton";

export default function AboutUsPage() {
  const { schoolInfo, isLoading } = useSchoolInfo();

  if (isLoading || !schoolInfo) {
    return (
        <div className="flex min-h-screen w-full flex-col bg-background">
            <Header title="About Us" />
            <main className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8">
                <div className="mx-auto w-full max-w-4xl space-y-8">
                    <Skeleton className="h-64 w-full" />
                    <div className="grid gap-8 md:grid-cols-2">
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                     <Skeleton className="h-32 w-full" />
                </div>
            </main>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header title="About Us" />
      <main className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-4xl">
          <Card className="overflow-hidden">
            <div className="relative h-64 w-full">
              <Image
                src="https://hiltonconventschool.edu.in/Gallery/IMG-20240403-WA0050.jpg"
                alt="School building"
                layout="fill"
                objectFit="cover"
                data-ai-hint="school building students"
              />
            </div>
            <CardHeader className="text-center pt-6">
              <CardTitle className="text-3xl font-bold text-primary">
                {schoolInfo.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground">
              <p>
                A place of learning, innovation, and growth, dedicated to
                nurturing the leaders of tomorrow.
              </p>
            </CardContent>
          </Card>

          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Target /> Our Mission
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Our mission is to provide a safe, disciplined, and productive
                  environment that empowers all students to develop their full
                  potential. We are committed to fostering a love for learning,
                  a respect for diversity, and a dedication to community service.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <BookOpen /> Our Vision
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  We envision a school community where all students are
                  challenged to achieve their highest academic and personal
                  potential. We strive to create a dynamic learning
                  experience that prepares students for a successful future in a
                  globally competitive world.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Building /> From the Principal's Desk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Welcome to {schoolInfo.name}! We believe in creating an
                atmosphere of reverence for education and a healthy environment
                where work, sports, and co-curricular activities will mould our
                students and spur them on to be the brightest and the best. We
                strive to provide our students with the best opportunities for
                an all-round development.
              </p>
            </CardContent>
          </Card>

           <Card className="mt-8">
            <CardHeader>
                <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14">
                        <AvatarFallback className="text-xl">LC</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-xl">A Note from the Developer</CardTitle>
                        <p className="text-muted-foreground">Lucky Chawla, Class XII</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>
                    Hey, I’m Lucky Chawla! I’m a Class XII coder and AI enthusiast, and the developer behind the all-new Hilton Convent School website. At 16, I rebuilt the entire site from scratch because the old one was buggy, lacked basic features, and crashed constantly. This project is the result of days and nights of hard work, built with React, Next.js, TypeScript, and Supabase SQL Database.
                </p>
                <p>
                    A big shoutout to Priyanka Varshney Ma’am, who left the school recently—when I entered Class XI, she explained SQL databases so clearly that I was able to implement the entire website using Supabase. Her teachings on DBMS in Class IX and X gave me the foundation to understand complex database structures and bring this site to life.
                </p>
                <p>
                    I also completed my Class X here with 88.4% in the 2023–24 session, scoring 96 in IT (Computer). Even after switching my subject from Computer Science to Physical Education in Class XI, I didn’t stop—my passion kept me coding, and that’s how this website came to life.
                </p>
                <p>
                    Now, I’m chasing bigger dreams: developing India’s own OS and AI solutions.
                </p>
                 <div className="border-t pt-4">
                    <p className="font-semibold text-foreground flex items-center gap-2">
                        <Mail className="h-4 w-4" /> Reach me at: <a href="mailto:luckychawlaup@gmail.com" className="text-primary hover:underline">luckychawlaup@gmail.com</a>
                    </p>
                     <p className="flex items-center gap-2 mt-2">
                         <Bot className="h-4 w-4" />
                        Let’s talk code, AI, or game-changing tech ideas. 🚀
                    </p>
                </div>
            </CardContent>
        </Card>
        </div>
      </main>
    </div>
  );
}
