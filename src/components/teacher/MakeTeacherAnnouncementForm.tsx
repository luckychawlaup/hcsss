
"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { addAnnouncement } from "@/lib/firebase/announcements";
import type { Teacher } from "@/lib/firebase/teachers";
import type { Student } from "@/lib/firebase/students";

const announcementSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long."),
  content: z.string().min(10, "Content must be at least 10 characters long."),
  category: z.string().min(2, "Category is required."),
  targetType: z.enum(["class", "student"], { required_error: "Please select a target type." }),
  target: z.string({ required_error: "Please select a target."}),
});

interface MakeTeacherAnnouncementFormProps {
    teacher: Teacher | null;
    students: Student[];
}

export default function MakeTeacherAnnouncementForm({ teacher, students }: MakeTeacherAnnouncementFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const assignedClasses = useMemo(() => {
    if (!teacher) return [];
    const classes = new Set<string>();
    if (teacher.classTeacherOf) classes.add(teacher.classTeacherOf);
    if (teacher.classesTaught) teacher.classesTaught.forEach(c => classes.add(c));
    return Array.from(classes).sort();
  }, [teacher]);

  const form = useForm<z.infer<typeof announcementSchema>>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: "",
      content: "",
      category: "General",
      targetType: "class",
    },
  });

  const targetType = form.watch("targetType");
  const selectedClass = form.watch("target");

  const studentsInSelectedClass = useMemo(() => {
    if (targetType === 'student' && selectedClass) {
        return students.filter(s => `${s.class}-${s.section}` === selectedClass);
    }
    return [];
  }, [students, targetType, selectedClass]);


  async function onSubmit(values: z.infer<typeof announcementSchema>) {
    setIsLoading(true);
    setError(null);

    const announcementData = {
        title: values.title,
        content: values.content,
        category: values.category,
        target: "students" as const, // Always for students from teacher's side
        targetAudience: {
            type: values.targetType,
            value: values.target,
        },
        createdBy: teacher?.id,
        creatorName: teacher?.name,
    };

    try {
      await addAnnouncement(announcementData as any);
      toast({
        title: "Announcement Published!",
        description: "Your announcement has been successfully published to the selected students.",
      });
      form.reset();
    } catch (e: any) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Announcement Title</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., Upcoming Test" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., Exam, Reminder" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Content</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Write the full announcement details here..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <div className="space-y-4">
                <FormField
                    control={form.control}
                    name="targetType"
                    render={({ field }) => (
                    <FormItem className="space-y-3">
                        <FormLabel>Select Target</FormLabel>
                        <FormControl>
                            <RadioGroup
                            onValueChange={(value) => {
                                field.onChange(value);
                                form.setValue("target", ""); // Reset target when type changes
                            }}
                            defaultValue={field.value}
                            className="flex items-center space-x-4"
                            >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="class" />
                                </FormControl>
                                <FormLabel className="font-normal">Entire Class</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="student" />
                                </FormControl>
                                <FormLabel className="font-normal">Specific Student</FormLabel>
                            </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />

                {targetType === 'class' && (
                    <FormField
                        control={form.control}
                        name="target"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Select Class</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {assignedClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
                
                {targetType === 'student' && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select onValueChange={(value) => form.setValue("target", value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="First, select a class" />
                            </SelectTrigger>
                            <SelectContent>
                                {assignedClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <FormField
                            control={form.control}
                            name="target"
                            render={({ field }) => (
                                <FormItem>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedClass}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Then, select a student" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {studentsInSelectedClass.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.srn})</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                )}
           </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Publish Announcement
          </Button>
        </form>
      </Form>
    </>
  );
}
