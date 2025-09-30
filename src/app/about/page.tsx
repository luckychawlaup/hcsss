
"use client";
import Header from "@/components/dashboard/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Building, Target, BookOpen, Mail, Bot, Code } from "lucide-react";
import Image from "next/image";
import { useSchoolInfo } from "@/hooks/use-school-info";
import { Skeleton } from "@/components/ui/skeleton";

export default function AboutUsPage() {
  const { schoolInfo } = useSchoolInfo();

  if (!schoolInfo) {
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
        <div className="mx-auto w-full max-w-4xl space-y-8">
          <Card className="overflow-hidden shadow-lg">
            <div className="relative h-64 w-full">
              <Image
                src="https://hiltonconventschool.edu.in/Gallery/IMG-20240403-WA0050.jpg"
                alt="School building"
                layout="fill"
                objectFit="cover"
                data-ai-hint="school building students"
                priority
              />
               <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
            <CardContent className="relative -mt-16 bg-gradient-to-t from-card via-card to-transparent p-6 pt-24 text-center">
                <h1 className="text-4xl font-bold text-primary">{schoolInfo.name}</h1>
                <p className="mt-2 text-lg text-muted-foreground">
                    A place of learning, innovation, and growth, dedicated to
                    nurturing the leaders of tomorrow.
                </p>
            </CardContent>
          </Card>

          <div className="grid gap-8 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Target className="text-primary h-7 w-7" /> Our Mission
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  To provide a safe, disciplined, and productive
                  environment that empowers all students to develop their full
                  potential. We are committed to fostering a love for learning,
                  a respect for diversity, and a dedication to community service.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <BookOpen className="text-primary h-7 w-7" /> Our Vision
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  To envision a school community where all students are
                  challenged to achieve their highest academic and personal
                  potential, preparing them for a successful future in a
                  globally competitive world.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Building className="text-primary h-7 w-7" /> From the Principal's Desk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Welcome to {schoolInfo.name}! We believe in creating an
                atmosphere of reverence for education and a healthy environment
                where work, sports, and co-curricular activities will mould our
                students and spur them on to be the brightest and the best.
              </p>
            </CardContent>
          </Card>

           <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-secondary via-background to-background shadow-lg">
               <div className="absolute -top-10 -right-10 h-32 w-32 text-primary/5 opacity-50">
                    <Code className="h-full w-full" />
                </div>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-primary/50">
                        <AvatarFallback className="text-2xl bg-primary/10 text-primary font-semibold">LC</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-2xl">A Note from the Developer</CardTitle>
                        <p className="text-md text-muted-foreground">Lucky Chawla, Class XII</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
                <p>
                    Hey, I’m Lucky Chawla! I’m a Class XII coder and AI enthusiast who developed this new Hilton Convent School website. I rebuilt the site from scratch to fix bugs, add modern features, and create a stable platform for our school community. This project is the result of countless hours of hard work, built with a modern tech stack including React, Next.js, and TypeScript.
                </p>
                <p>
                    A huge thank you to Priyanka Varshney Ma’am, whose clear explanations of SQL databases in Class XI gave me the foundation to build this site’s backend with Supabase. Her early lessons on DBMS were instrumental in bringing this project to life.
                </p>
                <p>
                    Even after switching from Computer Science to Physical Education in Class XI, my passion for coding never stopped. Now, I’m chasing bigger dreams: developing India’s own OS and AI solutions.
                </p>
                 <div className="border-t-2 border-dashed border-primary/10 pt-6 mt-6 text-center bg-primary/5 rounded-lg p-4">
                    <p className="font-semibold text-foreground flex items-center justify-center gap-2">
                        <Mail className="h-5 w-5 text-primary" /> Let's Connect!
                    </p>
                     <p className="text-sm mt-1">
                        Reach me at <a href="mailto:luckychawlaup@gmail.com" className="text-primary font-semibold hover:underline">luckychawlaup@gmail.com</a>
                    </p>
                     <p className="flex items-center justify-center gap-2 mt-2 text-sm">
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
