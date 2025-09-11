
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import { app } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Loader2, CalendarIcon, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getTeacherById, updateTeacher } from "@/lib/firebase/teachers";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  teacherId: z.string().length(8, "Teacher ID must be exactly 8 characters."),
  joiningDate: z.date({ required_error: "Date of joining is required." }),
  password: z.string().min(8, "Password must be at least 8 characters long."),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export default function TeacherSignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const auth = getAuth(app);

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      teacherId: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof signupSchema>) {
    setIsLoading(true);
    setError(null);

    try {
      // --- Verification Step ---
      // This check must happen on a backend with admin privileges, 
      // but for this example, we'll assume a client-side check after auth.
      // The direct call `getTeacherById` before auth will fail due to security rules.
      
      const teacherRecord = await getTeacherById(values.teacherId);
      
      if (!teacherRecord) {
        setError("Invalid Teacher ID. Please check the ID provided by the principal.");
        setIsLoading(false);
        return;
      }

      if(teacherRecord.authUid) {
        setError("This Teacher ID is already linked to an account.");
        setIsLoading(false);
        return;
      }
      
      const formattedJoiningDate = new Date(teacherRecord.joiningDate).toDateString();
      const providedJoiningDate = values.joiningDate.toDateString();

      if (teacherRecord.name.toLowerCase() !== values.name.toLowerCase() || formattedJoiningDate !== providedJoiningDate) {
        setError("The details entered do not match our records. Please verify your Name and Joining Date.");
        setIsLoading(false);
        return;
      }
      // --- End Verification ---

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: values.name,
      });

      // Link Auth UID and email to teacher record in DB
      await updateTeacher(values.teacherId, { authUid: user.uid, email: user.email! });

      await sendEmailVerification(user);

      toast({
        title: "Account Created! Please Verify Your Email.",
        description: "We've sent a verification link to your email. You must verify your email before you can log in.",
      });

      router.push("/auth/teacher/login");

    } catch (error: any) {
        const errorCode = error.code;
        let errorMessage = "An unknown error occurred. Please try again.";
        if (errorCode === 'auth/email-already-in-use') {
            errorMessage = "This email is already registered. Please try logging in.";
        }
        if (errorCode === 'permission-denied') {
            errorMessage = "Verification failed. Ensure your Teacher ID and other details are correct. You may not have permission to register.";
        }
        setError(errorMessage);
        setIsLoading(false);
    }
  }

  return (
    <>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name (as on Joining Letter)</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="teacherId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teacher ID</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. TCHR1234" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="teacher@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
                control={form.control}
                name="joiningDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date of Joining</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                               format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Teacher Account
          </Button>
        </form>
      </Form>
    </>
  );
}
