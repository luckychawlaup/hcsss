"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
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
const ACCEPTED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];

const homeworkSchema = z.object({
  classSection: z.string({ required_error: "Please select a class." }),
  subject: z.string().min(2, "Subject is required."),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters."),
  dueDate: z.date({ required_error: "Due date is required." }),
  attachment: z.any()
    .optional()
    .refine((files) => {
      // If no files selected, that's valid (optional)
      if (!files || files.length === 0) return true;
      // Check file size
      return files[0]?.size <= MAX_FILE_SIZE;
    }, `Max file size is 5MB.`)
    .refine((files) => {
      // If no files selected, that's valid (optional)
      if (!files || files.length === 0) return true;
      // Check file type
      return ACCEPTED_FILE_TYPES.includes(files[0]?.type);
    }, "Only PDF, JPEG, and PNG formats are supported."),
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
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
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

    if (teacher.classes_taught && Array.isArray(teacher.classes_taught)) {
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
      classSection: assignedClasses.length > 0 ? assignedClasses[0] : "",
      dueDate: new Date(),
      attachment: undefined,
    });
    
    // Clear file input
    const fileInput = document.getElementById('homework-attachment') as HTMLInputElement;
    if (fileInput) {
        fileInput.value = '';
    }
  }

  // Load homework history when teacher changes
  useEffect(() => {
    if (!teacher?.id) {
      setHomeworkHistory([]);
      setIsLoadingHistory(false);
      return;
    }

    setIsLoadingHistory(true);
    
    try {
      const channel = getHomeworksByTeacher(teacher.id, (homeworks) => {
        console.log('Received homework history:', homeworks);
        setHomeworkHistory(homeworks || []);
        setIsLoadingHistory(false);
      });
      
      return () => {
        if (channel && typeof channel.unsubscribe === 'function') {
          channel.unsubscribe();
        }
      };
    } catch (error) {
      console.error('Error setting up homework history subscription:', error);
      setIsLoadingHistory(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load homework history."
      });
    }
  }, [teacher?.id, toast]);

  // Reset form when editing state changes
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
  }, [editingHomework, reset, teacher, assignedClasses]);

  async function onSubmit(values: z.infer<typeof homeworkSchema>) {
    console.log('Form submission started with values:', values);
    
    if (!teacher?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Teacher information not found. Please refresh and try again.",
      });
      return;
    }

    if (assignedClasses.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No classes assigned to you. Please contact administration.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get the file from the input
      let file: File | undefined = undefined;
      if (values.attachment && values.attachment instanceof FileList && values.attachment.length > 0) {
        file = values.attachment[0];
        console.log('File selected for upload:', file.name, file.type, file.size);
      } else if (values.attachment && values.attachment.length > 0) {
        file = values.attachment[0];
        console.log('File selected for upload:', file.name, file.type, file.size);
      }
      
      if (editingHomework) {
        // Update existing homework
        const updatedData: Partial<Homework> = {
          class_section: values.classSection,
          subject: values.subject,
          description: values.description,
          due_date: format(values.dueDate, "yyyy-MM-dd"),
        };
        
        console.log('Updating homework with data:', updatedData);
        await updateHomework(editingHomework.id, updatedData, file);
        
        toast({
          title: "Success!",
          description: `Homework for ${values.classSection} has been updated successfully.`,
        });
        
        setEditingHomework(null);
      } else {
        // Add new homework
        const homeworkData: Omit<Homework, 'id'> = {
          assigned_by: teacher.id,
          teacher_name: teacher.name || 'Unknown Teacher',
          class_section: values.classSection,
          subject: values.subject,
          description: values.description,
          due_date: format(values.dueDate, "yyyy-MM-dd"),
          assigned_at: new Date().toISOString(),
        };
        
        console.log('Adding new homework with data:', homeworkData);
        await addHomework(homeworkData, file);
        
        toast({
          title: "Success!",
          description: `Homework for ${values.classSection} has been assigned successfully.`,
        });
      }

      resetForm();

    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Could not save the homework. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleCancelEdit = () => {
    setEditingHomework(null);
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

  if (!teacher) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Teacher Profile Found</h3>
          <p className="text-muted-foreground">Please ensure you are logged in as a teacher.</p>
        </div>
      </div>
    );
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
                      disabled={assignedClasses.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            assignedClasses.length === 0 
                              ? "No classes assigned" 
                              : "Select a class to assign homework"
                          } />
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
                          <Button 
                            variant={"outline"} 
                            className={cn(
                              "w-full pl-3 text-left font-normal", 
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar 
                          mode="single" 
                          selected={field.value} 
                          onSelect={field.onChange} 
                          initialFocus 
                          disabled={(date) => date < new Date()}
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
                render=
                        {({ field }) => (
                  <FormItem>
                    <FormLabel>Supporting Document (Optional)</FormLabel>
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
                    <p className="text-xs text-muted-foreground">
                      PDF, JPEG, PNG files only. Max 5MB.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Button 
              type="submit" 
              disabled={isSubmitting || assignedClasses.length === 0} 
              className="w-full"
            >
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
              <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={handleCancelEdit}
                disabled={isSubmitting}
              >
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
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading history...</span>
                  </div>
                ) : homeworkHistory.length > 0 ? (
                  homeworkHistory.map(hw => (
                    <div key={hw.id} className="text-sm p-3 bg-secondary/50 rounded-md">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 mr-2">
                          <p className="font-bold">{hw.subject} - {hw.class_section}</p>
                          <p className="text-muted-foreground line-clamp-2">{hw.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Due: {formatDueDate(hw.due_date)}
                          </p>
                          {hw.attachment_url && (
                            <p className="text-xs text-blue-600 mt-1">📎 Has attachment</p>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={() => setEditingHomework(hw)}
                            disabled={isSubmitting}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={() => handleDeleteClick(hw)}
                            disabled={isSubmitting}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No homework assigned yet.
                  </p>
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
              This will permanently delete the homework for {deletingHomework?.class_section} ({deletingHomework?.subject}). 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}