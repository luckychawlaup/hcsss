
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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

import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Loader2, CalendarIcon, Upload, BookCheck, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Teacher } from "@/lib/supabase/teachers";
import { addHomework, getHomeworksByTeacher, deleteHomework, updateHomework } from "@/lib/supabase/homework";
import type { Homework } from "@/lib/supabase/homework";
import { ScrollArea } from "../ui/scroll-area";

const homeworkSchema = z.object({
  classSection: z.string({ required_error: "Please select a class." }),
  subject: z.string().min(2, "Subject is required."),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters."),
  dueDate: z.date({ required_error: "Due date is required." }),
  attachment: z.any().optional(),
});

interface AddHomeworkFormProps {
  teacher: Teacher | null;
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
    
    if (teacher.classTeacherOf) {
        classes.add(teacher.classTeacherOf);
    }

    if (teacher.classesTaught) {
        teacher.classesTaught.forEach(c => classes.add(c));
    }
    
    return Array.from(classes).sort();

  }, [teacher]);


  const form = useForm<z.infer<typeof homeworkSchema>>({
    resolver: zodResolver(homeworkSchema),
    defaultValues: {
      subject: teacher?.subject || "",
      description: "",
      dueDate: new Date(),
    },
  });

  const { reset } = form;

  useEffect(() => {
    if (teacher) {
        const unsubscribe = getHomeworksByTeacher(teacher.id, (homeworks) => {
            setHomeworkHistory(homeworks);
        });
        return () => {
            if(unsubscribe && typeof unsubscribe.unsubscribe === 'function') {
                unsubscribe.unsubscribe();
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
        dueDate: parseISO(editingHomework.due_date),
        attachment: undefined,
      });
    } else {
      reset({
        subject: teacher?.subject || "",
        description: "",
        classSection: "",
        dueDate: new Date(),
        attachment: undefined,
      });
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
      const file = values.attachment?.[0];
      
      if(editingHomework) {
        // Update existing homework
        const updatedData: Partial<Homework> = {
            class_section: values.classSection,
            subject: values.subject,
            description: values.description,
            due_date: format(values.dueDate, "yyyy-MM-dd"),
        }
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

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "Could not post the homework. Please try again.",
      });
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDeleteClick = (homework: Homework) => {
    setDeletingHomework(homework);
    setIsDeleteAlertOpen(true);
  }

  const confirmDelete = async () => {
    if(!deletingHomework) return;
    try {
        await deleteHomework(deletingHomework.id);
        toast({
            title: "Homework Deleted",
            description: "The homework assignment has been successfully removed."
        });
        setIsDeleteAlertOpen(false);
        setDeletingHomework(null);
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Deletion Failed",
            description: "Could not delete the homework assignment. Please try again."
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
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a class to assign homework" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assignedClasses.map((cs) => (
                          <SelectItem key={cs} value={cs!}>
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
                          disabled={(date) => date < startOfDay(new Date())}
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
                name="attachment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attachment (Optional)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Upload className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="homework-attachment"
                          type="file"
                          className="pl-9"
                          {...form.register("attachment")}
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
                <Button type="button" variant="outline" className="w-full" onClick={() => setEditingHomework(null)}>
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
                                        <div>
                                            <p className="font-bold">{hw.subject} - {hw.class_section}</p>
                                            <p className="text-muted-foreground truncate">{hw.description}</p>
                                            <p className="text-xs text-muted-foreground mt-1">Due: {hw.due_date}</p>
                                        </div>
                                        <div className="flex gap-1">
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

       <Dialog open={!!editingHomework} onOpenChange={(isOpen) => !isOpen && setEditingHomework(null)}>
            <DialogContent>
                 <DialogHeader>
                    <DialogTitle>Edit Homework</DialogTitle>
                    <DialogDescription>
                        Update the details for this homework assignment.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="classSection"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Class</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {assignedClasses.map((cs) => (<SelectItem key={cs} value={cs!}>{cs}</SelectItem>))}
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
                                <FormControl><Input {...field} /></FormControl>
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
                                <FormControl><Textarea {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="dueDate"
                            render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Due Date</FormLabel>
                                <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal",!field.value && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value ? format(field.value, "PPP") : (<span>Pick a date</span>)}
                                    </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < startOfDay(new Date())} initialFocus />
                                </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="attachment"
                            render={() => (
                            <FormItem>
                                <FormLabel>New Attachment (Optional)</FormLabel>
                                <FormControl>
                                <Input type="file" {...form.register("attachment")} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditingHomework(null)} disabled={isSubmitting}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

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
