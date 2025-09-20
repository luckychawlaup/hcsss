
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
import { Loader2, AlertCircle, Send } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { addAnnouncement } from "@/lib/firebase/announcements";
import type { Teacher } from "@/lib/firebase/teachers";
import type { Student } from "@/lib/firebase/students";

const announcementSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long."),
  content: z.string().min(10, "Content must be at least 10 characters long."),
  category: z.string().min(2, "Category is required."),
  targetType: z.enum(["class", "student"], { required_error: "Please select a target type." }),
  targetValue: z.string({ required_error: "Please select a target."}),
});

interface MakeTeacherAnnouncementFormProps {
    teacher: Teacher | null;
    students: Student[];
}

export default function MakeTeacherAnnouncementForm({ teacher, students }: MakeTeacherAnnouncementFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClassForStudent, setSelectedClassForStudent] = useState("");
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
      targetValue: "",
    },
  });

  const targetType = form.watch("targetType");

  const studentsInSelectedClass = useMemo(() => {
    if (targetType === 'student' && selectedClassForStudent) {
        return students.filter(s => `${s.class}-${s.section}` === selectedClassForStudent);
    }
    return [];
  }, [students, targetType, selectedClassForStudent]);


  async function onSubmit(values: z.infer<typeof announcementSchema>) {
    if (!teacher) {
        toast({ variant: "destructive", title: "Authentication error" });
        return;
    }
    setIsLoading(true);
    setError(null);

    const announcementData = {
        title: values.title,
        content: values.content,
        category: values.category,
        target: "students" as const,
        targetAudience: {
            type: values.targetType,
            value: values.targetValue,
        },
        createdBy: teacher?.id,
        creatorName: teacher?.name,
        creatorRole: "Teacher" as const,
    };

    try {
      await addAnnouncement(announcementData as any);
      toast({
        title: "Announcement Sent!",
        description: "Your announcement has been published to the selected students.",
      });
      form.reset();
      setSelectedClassForStudent("");
    } catch (e: any) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-background rounded-lg p-4 border">
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
                name="title"
                render={({ field }) => (
                <FormItem>
                    <FormControl>
                    <Input placeholder="Title" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                <FormItem>
                    <FormControl>
                    <Textarea
                        placeholder="Write your announcement here..."
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
                    <FormItem className="space-y-2">
                        <FormLabel className="text-xs">Send to:</FormLabel>
                        <FormControl>
                            <RadioGroup
                            onValueChange={(value) => {
                                field.onChange(value);
                                form.setValue("targetValue", "");
                                setSelectedClassForStudent("");
                            }}
                            defaultValue={field.value}
                            className="flex items-center space-x-4"
                            >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl><RadioGroupItem value="class" /></FormControl>
                                <FormLabel className="font-normal text-xs">Entire Class</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl><RadioGroupItem value="student" /></FormControl>
                                <FormLabel className="font-normal text-xs">Specific Student</FormLabel>
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
                        name="targetValue"
                        render={({ field }) => (
                            <FormItem>
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
                        <Select onValueChange={setSelectedClassForStudent} value={selectedClassForStudent}>
                           <SelectTrigger><SelectValue placeholder="First, select a class" /></SelectTrigger>
                            <SelectContent>
                                {assignedClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <FormField
                            control={form.control}
                            name="targetValue"
                            render={({ field }) => (
                                <FormItem>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedClassForStudent}>
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
           <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                 <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                    <FormItem>
                        <FormControl>
                        <Input placeholder="Category (e.g., Exam)" {...field} className="h-9 w-32" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <Button type="submit" disabled={isLoading} size="sm">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Send Announcement
                </Button>
           </div>
        </form>
      </Form>
    </div>
  );
}
