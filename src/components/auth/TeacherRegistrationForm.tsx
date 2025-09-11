
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
  deleteUser,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { verifyAndClaimTeacherAccount } from "@/lib/firebase/teachers";

const registrationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  registrationKey: z.string().min(6, "Registration key is required."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export default function TeacherRegistrationForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const auth = getAuth(app);

  const form = useForm<z.infer<typeof registrationSchema>>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: "",
      email: "",
      registrationKey: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof registrationSchema>) {
    setIsLoading(true);
    setError(null);
    let tempUser = null;

    try {
      // Step 1: Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      tempUser = userCredential.user;

      // Step 2: Verify the registration details and claim the account
      const verificationResult = await verifyAndClaimTeacherAccount({
        authUid: tempUser.uid,
        email: values.email,
        name: values.name,
        registrationKey: values.registrationKey,
      });

      if (!verificationResult.success) {
        throw new Error(verificationResult.message);
      }

      // Step 3: Update profile and send verification email
      await updateProfile(tempUser, { displayName: values.name });
      await sendEmailVerification(tempUser);

      toast({
        title: "Registration Successful!",
        description: "Your account is created. Please check your email to verify your address before logging in.",
      });

      router.push("/auth/teacher/login");

    } catch (error: any) {
      // If any step fails, delete the created user to prevent orphaned accounts
      if (tempUser) {
        await deleteUser(tempUser);
      }
      let errorMessage = "An unknown error occurred.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email is already registered. Please try logging in.";
      } else {
        errorMessage = error.message;
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
            name="registrationKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Registration Key</FormLabel>
                <FormControl>
                  <Input placeholder="Provided by the school" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name (as registered by school)</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
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
                <FormLabel>Email Address (as registered by school)</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="teacher@example.com" {...field} />
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
                <FormLabel>Set Your Password</FormLabel>
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
            Register Account
          </Button>
        </form>
      </Form>
    </>
  );
}
