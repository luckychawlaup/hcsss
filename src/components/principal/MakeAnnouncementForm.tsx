
"use client";

import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, Send } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { addAnnouncement } from "@/lib/supabase/announcements";
import { User } from "@supabase/supabase-js";

const announcementSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long."),
  content: z.string().min(10, "Content must be at least 10 characters long."),
  category: z.string().min(2, "Category is required."),
  target: z.enum(["students", "teachers", "both"], {
    required_error: "You need to select a target audience.",
  }),
});

interface MakeAnnouncementFormProps {
    currentUser: User | null;
    isOwner: boolean;
}

export default function MakeAnnouncementForm({ currentUser, isOwner }: MakeAnnouncementFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof announcementSchema>>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: "",
      content: "",
      category: "General",
      target: "both",
    },
  });

  async function onSubmit(values: z.infer<typeof announcementSchema>) {
    if (!currentUser) {
        toast({ variant: 'destructive', title: 'Not Authenticated' });
        return;
    }
    setIsLoading(true);
    setError(null);

    try {
      await addAnnouncement({
          ...values,
          created_by: currentUser.id,
          creator_name: isOwner ? "Owner" : "Principal",
          creator_role: isOwner ? "Owner" : "Principal",
      });
      toast({
        title: "Announcement Published!",
        description: "Your announcement has been successfully published.",
      });
      form.reset({
        title: "",
        content: "",
        category: "General",
        target: "both",
      });
    } catch (e: any) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-background rounded-lg p-4">
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
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex flex-wrap gap-4 items-center">
                     <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                        <FormItem>
                            <FormControl>
                            <Input placeholder="Category (e.g., Event)" {...field} className="h-9 w-32" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="target"
                        render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex items-center space-x-4"
                                >
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="students" /></FormControl>
                                    <FormLabel className="font-normal text-xs">Students</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="teachers" /></FormControl>
                                    <FormLabel className="font-normal text-xs">Teachers</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="both" /></FormControl>
                                    <FormLabel className="font-normal text-xs">Both</FormLabel>
                                </FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                 <Button type="submit" disabled={isLoading} size="sm">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Send
                </Button>
            </div>
        </form>
      </Form>
    </div>
  );
}
