
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  getAuth,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";
import { app } from "@/lib/firebase";
import { useRouter } from "next/navigation";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getTeacherByAuthId, updateTeacher } from "@/lib/firebase/teachers";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

interface LoginFormProps {
  role: "student" | "teacher" | "principal";
}

export default function LoginForm({ role }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const auth = getAuth(app);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    setError(null);
    setNeedsVerification(false);
    setNeedsPasswordChange(false);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const user = userCredential.user;

      if (role === "principal") {
        if (
          user.uid !== "hvldHzYq4ZbZlc7nym3ICNaEI1u1" ||
          values.email !== "principal@hcsss.in"
        ) {
          setError("Invalid credentials for principal account.");
          await auth.signOut();
          setIsLoading(false);
          return;
        }
        router.push("/principal");
        router.refresh();
        return;
      }
      
      if (!user.emailVerified) {
        setNeedsVerification(true);
        setError(
          "Your email is not verified. A new verification link has been sent to your inbox."
        );
        await sendEmailVerification(user);
        toast({
          title: "Verification Email Sent",
          description:
            "Please check your inbox to verify your email address before logging in.",
        });
        await auth.signOut();
        setIsLoading(false);
        return;
      }

      if (role === "teacher") {
        const teacherProfile = await getTeacherByAuthId(user.uid);
        if (teacherProfile?.mustChangePassword) {
          setNeedsPasswordChange(true);
          setError(
            "This is your first login. For security, you must change your temporary password. A password reset link has been sent to your email."
          );
          await sendPasswordResetEmail(auth, user.email!);
          await updateTeacher(teacherProfile.id, { mustChangePassword: false, tempPassword: "" });
          await auth.signOut();
          setIsLoading(false);
          return;
        }
        document.cookie = "teacher-role=true; path=/; max-age=86400"; // Set cookie for 1 day
        router.push("/teacher");
      } else {
        document.cookie = "teacher-role=; path=/; max-age=-1"; // Clear teacher cookie for student
        router.push("/");
      }

      toast({
        title: "Login Successful",
        description: `Welcome back!`,
      });

      router.refresh();
    } catch (error: any) {
      const errorCode = error.code;
      let errorMessage = "An unknown error occurred.";
      if (
        errorCode === "auth/user-not-found" ||
        errorCode === "auth/wrong-password" ||
        errorCode === "auth/invalid-credential"
      ) {
        errorMessage = "Invalid email or password. Please try again.";
      } else if (errorCode === "auth/too-many-requests") {
        errorMessage =
          "Too many failed login attempts. Please try again later.";
      }
      setError(errorMessage);
      setIsLoading(false);
    }
  }

  return (
    <>
      {error && (
        <Alert
          variant={needsPasswordChange ? "default" : "destructive"}
          className={
            needsPasswordChange
              ? "bg-primary/10 border-primary/20"
              : ""
          }
        >
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {needsVerification
              ? "Email Verification Required"
              : needsPasswordChange
              ? "Password Change Required"
              : "Login Failed"}
          </AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder={
                      role === "principal"
                        ? "principal@hcsss.in"
                        : `${role}@example.com`
                    }
                    {...field}
                  />
                </FormControl>
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
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
        </form>
      </Form>
    </>
  );
}
