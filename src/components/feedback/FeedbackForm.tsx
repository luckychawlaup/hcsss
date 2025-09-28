

"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getStudentByAuthId } from "@/lib/supabase/students";
import { getTeacherByAuthId } from "@/lib/supabase/teachers";
import type { Student } from "@/lib/supabase/students";
import type { Teacher } from "@/lib/supabase/teachers";
import { addFeedback } from "@/lib/supabase/feedback";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send } from "lucide-react";

const feedbackSchema = z.object({
  category: z.enum([
    "General Issues",
    "Academic Concerns",
    "Student Record Issues",
    "Fee-related Issues",
    "Discipline & Behaviour",
    "Facilities & Infrastructure",
    "School Portal / IT Issues",
    "Suggestions & Ideas",
    "Feedback"
  ], {
    required_error: "Please select a category.",
  }),
  subject: z.string().min(5, "Subject must be at least 5 characters long."),
  description: z.string().min(20, "Description must be at least 20 characters long."),
});

export function FeedbackForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<Student | Teacher | null>(null);
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        const user = session?.user;
        if (user) {
            setCurrentUser(user);
            // Try fetching teacher profile, then student profile
            const teacher = await getTeacherByAuthId(user.id);
            if(teacher) {
                setUserProfile(teacher);
            } else {
                const student = await getStudentByAuthId(user.id);
                setUserProfile(student);
            }
        } else {
            setCurrentUser(null);
            setUserProfile(null);
        }
    });
    return () => {
        authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const form = useForm<z.infer<typeof feedbackSchema>>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      subject: "",
      description: "",
    },
  });

  async function onSubmit(values: z.infer<typeof feedbackSchema>) {
    if (!currentUser || !userProfile) {
        toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "You must be logged in to submit feedback.",
        });
        return;
    }
    setIsSubmitting(true);

    const isStudent = !('classes_taught' in userProfile);
    
    let userName: string;
    const studentProfile = userProfile as Student;

    if (isStudent && (values.category === 'Fee-related Issues' || values.category === 'School Portal / IT Issues')) {
      userName = `${studentProfile.name} (SRN: ${studentProfile.srn})`;
    } else if (isStudent) {
      userName = 'Anonymous Student';
    } else {
      userName = userProfile.name;
    }
    
    const userClass = isStudent ? `${(userProfile as Student).class}-${(userProfile as Student).section}` : undefined;

    try {
        await addFeedback({
            user_id: currentUser.id,
            user_name: userName,
            user_role: isStudent ? 'Student' : 'Teacher',
            class: userClass,
            ...values,
        });

        toast({
            title: "Submission Successful",
            description: "Thank you! Your feedback has been received.",
        });
        form.reset();

    } catch (error) {
        toast({
            variant: "destructive",
            title: "Submission Failed",
            description: "Could not submit your feedback. Please try again later.",
        });
        console.error("Feedback submission error:", error);
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Submit Your Feedback</CardTitle>
            <CardDescription>
                Your identity will remain anonymous for most categories. For 'Fee-related Issues' and 'School Portal / IT Issues', your name will be shared with the relevant department to help resolve your issue. Your complaints will be forwarded directly to the appropriate school authority.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="General Issues">General Issues</SelectItem>
                            <SelectItem value="Academic Concerns">Academic Concerns</SelectItem>
                            <SelectItem value="Student Record Issues">Student Record Issues</SelectItem>
                            <SelectItem value="Fee-related Issues">Fee-related Issues</SelectItem>
                            <SelectItem value="Discipline & Behaviour">Discipline & Behaviour</SelectItem>
                            <SelectItem value="Facilities & Infrastructure">Facilities & Infrastructure</SelectItem>
                            <SelectItem value="School Portal / IT Issues">School Portal / IT Issues</SelectItem>
                            <SelectItem value="Suggestions & Ideas">Suggestions & Ideas</SelectItem>
                            <SelectItem value="Feedback">Feedback</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., Issue with cafeteria food" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                        <Textarea
                            placeholder="Please provide as much detail as possible..."
                            rows={6}
                            {...field}
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? (
                    <>
                        <Loader2 className="mr-2" />
                        Submitting...
                    </>
                    ) : (
                    <>
                        <Send className="mr-2" />
                        Submit
                    </>
                    )}
                </Button>
                </form>
            </Form>
        </CardContent>
    </Card>
  );
}
