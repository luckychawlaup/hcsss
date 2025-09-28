
import Header from "@/components/dashboard/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Building, Target, BookOpen } from "lucide-react";
import Image from "next/image";

export default function AboutUsPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header title="About Us" />
      <main className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-4xl">
          <Card className="overflow-hidden">
            <div className="relative h-48 w-full">
              <Image
                src="https://picsum.photos/seed/school/1200/400"
                alt="School building"
                layout="fill"
                objectFit="cover"
                data-ai-hint="school building"
              />
            </div>
            <CardHeader className="text-center pt-6">
              <CardTitle className="text-3xl font-bold text-primary">
                Hilton Convent Senior Secondary School
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
                Welcome to Hilton Convent! We believe in creating an
                atmosphere of reverence for education and a healthy environment
                where work, sports, and co-curricular activities will mould our
                students and spur them on to be the brightest and the best. We
                strive to provide our students with the best opportunities for
                an all-round development.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
