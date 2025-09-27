
"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, parseISO, startOfDay } from "date-fns";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import { cn } from "@/lib/utils";
import { Loader2, CalendarIcon, Upload, BookCheck, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Teacher } from "@/lib/supabase/teachers";
import { addHomework, getHomeworksByTeacher, deleteHomework, updateHomework } from "@/lib/supabase/homework";
import type { Homework } from "@/lib/supabase/homework";
import { ScrollArea } from "../ui/scroll-area";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ["application/pdf"];

const homeworkSchema = z.object({
  classSection: z.string({ required_error: "Please select a class." }),
  subject: z.string().min(2, "Subject is required."),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters."),
  dueDate: z.date({ required_error: "Due date is required." }),
  attachment: z.any()
    .optional()
    .refine((files) => !files || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => !files || files.length === 0 || ACCEPTED_FILE_TYPES.includes(files?.[0]?.type),
      "Only .pdf format is supported."
    ),
});

interface AddHomeworkFormProps {
  teacher: Teacher | null;
}

const formatDueDate = (date: string) => {
    try {
        return format(new Date(date), "do MMM, yyyy");
    } catch (e) {
        return "Invalid Date";
    }
}

export default function AddHomeworkForm({ teacher }: AddHomeworkFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [homeworkHistory, setHomeworkHistory] = useState<Homework[]>([]);
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null);
  const [deletingHomework, setDeletingHomework] = useState<Homework | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  
  const { toast } = useToast();

  const assignedClasses = useMemo(() => {
    if (!teacher) return [];
    
    const classes = new Set<string>();
    
    if (teacher.class_teacher_of) {
        classes.add(teacher.class_teacher_of);
    }

    if (teacher.classes_taught) {
        teacher.classes_taught.forEach(c => classes.add(c));
    }
    
    return Array.from(classes).sort();

  }, [teacher]);

  const form = useForm<z.infer<typeof homeworkSchema>>({
    resolver: zodResolver(homeworkSchema),
    defaultValues: {
      subject: teacher?.subject || "",
      description: "",
      classSection: "",
      dueDate: new Date(),
      attachment: undefined,
    },
  });

  const { reset } = form;
  
  const resetForm = () => {
       form.reset({
        subject: teacher?.subject || "",
        description: "",
        classSection: "",
        dueDate: new Date(),
        attachment: undefined,
      });
       const fileInput = document.getElementById('homework-attachment') as HTMLInputElement;
      if (fileInput) {
          fileInput.value = '';
      }
  }


  useEffect(() => {
    if (teacher) {
        const channel = getHomeworksByTeacher(teacher.id, (homeworks) => {
            setHomeworkHistory(homeworks);
        });
        
        return () => {
            if (channel && typeof channel.unsubscribe === 'function') {
                channel.unsubscribe();
            }
        };
    }
  }, [teacher]);

  useEffect(() => {
    if (editingHomework) {
      reset({
        classSection: editingHomework.class_section,
        subject: editingHomework.subject,
        description: editingHomework.description,
        dueDate: new Date(editingHomework.due_date),
        attachment: undefined,
      });
    } else {
      resetForm();
    }
  }, [editingHomework, reset, teacher]);

  async function onSubmit(values: z.infer<typeof homeworkSchema>) {
    
    if (!teacher) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Not logged in or teacher profile not found.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const file = values.attachment && values.attachment.length > 0 ? values.attachment[0] : undefined;
      
      if (editingHomework) {
        // Update existing homework
        const updatedData: Partial<Homework> = {
            class_section: values.classSection,
            subject: values.subject,
            description: values.description,
            due_date: format(values.dueDate, "yyyy-MM-dd"),
        };
        
        await updateHomework(editingHomework.id, updatedData, file);
        
        toast({
            title: "Homework Updated!",
            description: `Homework for ${values.classSection} has been updated.`,
        });
        
        setEditingHomework(null);
      } else {
        // Add new homework
        const homeworkData: Omit<Homework, 'id'> = {
            assigned_by: teacher.id,
            teacher_name: teacher.name,
            class_section: values.classSection,
            subject: values.subject,
            description: values.description,
            due_date: format(values.dueDate, "yyyy-MM-dd"),
            assigned_at: new Date().toISOString(),
        };
        
        await addHomework(homeworkData, file);
        
        toast({
            title: "Homework Assigned!",
            description: `Homework for ${values.classSection} has been posted.`,
        });
      }

      resetForm();

    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Could not post the homework. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleCancelEdit = () => {
    setEditingHomework(null);
    resetForm();
  }

  const handleDeleteClick = (homework: Homework) => {
    setDeletingHomework(homework);
    setIsDeleteAlertOpen(true);
  }

  const confirmDelete = async () => {
    if (!deletingHomework) return;
    
    try {
        await deleteHomework(deletingHomework.id);
        toast({
            title: "Homework Deleted",
            description: "The homework assignment has been successfully removed."
        });
        setIsDeleteAlertOpen(false);
        setDeletingHomework(null);
    } catch (error) {
        console.error('Delete error:', error);
        toast({
            variant: "destructive",
            title: "Deletion Failed",
            description: error instanceof Error ? error.message : "Could not delete the homework assignment. Please try again."
        });
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="classSection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a class to assign homework" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assignedClasses.map((cs) => (
                          <SelectItem key={cs} value={cs}>
                            {cs}
                          </SelectItem>
                        ))}
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
                      <Input placeholder="e.g. Mathematics" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Homework Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter all the details for the homework assignment..."
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="attachment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attachment (Optional, PDF only, max 5MB)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Upload className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="homework-attachment"
                          type="file"
                          className="pl-9"
                          accept={ACCEPTED_FILE_TYPES.join(",")}
                          onChange={(e) => {
                            const files = e.target.files;
                            field.onChange(files);
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={isSubmitting || assignedClasses.length === 0} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingHomework ? "Saving Changes..." : "Assigning Homework..."}
                </>
              ) : (
                editingHomework ? "Save Changes" : "Assign Homework"
              )}
            </Button>
            {editingHomework && (
                <Button type="button" variant="outline" className="w-full" onClick={handleCancelEdit}>
                    Cancel Edit
                </Button>
            )}
          </form>
        </Form>
      </div>
      <div>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <BookCheck />
                    Homework History
                </CardTitle>
                <CardDescription>
                    A complete history of all your assignments.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-96">
                    <div className="space-y-2 pr-4">
                        {homeworkHistory.length > 0 ? (
                            homeworkHistory.map(hw => (
                                <div key={hw.id} className="text-sm p-3 bg-secondary/50 rounded-md">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 mr-2">
                                            <p className="font-bold">{hw.subject} - {hw.class_section}</p>
                                            <p className="text-muted-foreground line-clamp-2">{hw.description}</p>
                                            <p className="text-xs text-muted-foreground mt-1">Due: {formatDueDate(hw.due_date)}</p>
                                            {hw.attachment_url && (
                                                <p className="text-xs text-blue-600 mt-1">📎 Has attachment</p>
                                            )}
                                        </div>
                                        <div className="flex gap-1 flex-shrink-0">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingHomework(hw)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteClick(hw)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No homework assigned yet.</p>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
      </div>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This will permanently delete the homework for {deletingHomework?.class_section} ({deletingHomework?.subject}). This action cannot be undone.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
