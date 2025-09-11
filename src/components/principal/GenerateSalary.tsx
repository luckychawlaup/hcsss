
"use client";

import { useState } from "react";
import * as z from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, PlusCircle, Trash2, Users, WalletCards } from "lucide-react";
import type { Teacher } from "@/lib/firebase/teachers";
import { addSalarySlip } from "@/lib/firebase/salary";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

const salarySchema = z.object({
  teacherId: z.string({ required_error: "Please select a teacher." }),
  month: z.string().min(1, "Month is required."),
  year: z.string().min(4, "Year is required."),
  basicSalary: z.coerce.number().min(0, "Basic salary must be a positive number."),
  earnings: z.array(
    z.object({
      name: z.string().min(1, "Earning name is required."),
      amount: z.coerce.number().min(0, "Amount must be positive."),
    })
  ).optional(),
  deductions: z.array(
    z.object({
      name: z.string().min(1, "Deduction name is required."),
      amount: z.coerce.number().min(0, "Amount must be positive."),
    })
  ).optional(),
});

interface GenerateSalaryProps {
  teachers: Teacher[];
  isLoading: boolean;
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

export default function GenerateSalary({ teachers, isLoading }: GenerateSalaryProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof salarySchema>>({
    resolver: zodResolver(salarySchema),
    defaultValues: {
      year: currentYear.toString(),
      month: months[new Date().getMonth()],
      basicSalary: 30000,
      earnings: [{ name: "HRA", amount: 12000 }, { name: "Special Allowance", amount: 5000 }],
      deductions: [{ name: "Provident Fund", amount: 1800 }, { name: "TDS", amount: 1500 }],
    },
  });

  const { fields: earningsFields, append: appendEarning, remove: removeEarning } = useFieldArray({
    control: form.control,
    name: "earnings",
  });

  const { fields: deductionsFields, append: appendDeduction, remove: removeDeduction } = useFieldArray({
    control: form.control,
    name: "deductions",
  });

  const onSubmit = async (values: z.infer<typeof salarySchema>) => {
    setIsSubmitting(true);
    try {
      const slipData = {
        teacherId: values.teacherId,
        month: `${values.month} ${values.year}`,
        basicSalary: values.basicSalary,
        earnings: values.earnings || [],
        deductions: values.deductions || [],
        status: "Paid" as const,
      };
      const newSlipId = await addSalarySlip(slipData);
      toast({
        title: "Salary Slip Generated!",
        description: `The salary slip for ${values.month} ${values.year} has been created.`,
      });
      
      const teacher = teachers.find(t => t.id === values.teacherId);
      if(teacher) {
        router.push(`/teacher/salary-slip/${slipData.month.replace(' ','-')}?slipId=${newSlipId}`);
      }

      form.reset();
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate salary slip. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <p>Loading teachers...</p>;
  }

  if (teachers.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Teachers Found</h3>
            <p className="text-muted-foreground mt-2">You need to add teachers before you can generate salaries.</p>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="teacherId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select Teacher</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a teacher" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name}
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
            name="month"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Month</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                    <SelectContent>
                        {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                    <SelectContent>
                        {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Earnings */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg text-green-600">Earnings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <FormField
                        control={form.control}
                        name="basicSalary"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Basic Salary</FormLabel>
                            <FormControl><Input type="number" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <Separator/>
                    {earningsFields.map((field, index) => (
                        <div key={field.id} className="flex gap-2 items-end">
                            <FormField
                                control={form.control}
                                name={`earnings.${index}.name`}
                                render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormLabel>Earning #{index + 1}</FormLabel>
                                    <FormControl><Input placeholder="e.g., HRA, Bonus" {...field} /></FormControl>
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`earnings.${index}.amount`}
                                render={({ field }) => (
                                <FormItem>
                                    <FormControl><Input type="number" placeholder="Amount" {...field} /></FormControl>
                                </FormItem>
                                )}
                            />
                            <Button type="button" variant="destructive" size="icon" onClick={() => removeEarning(index)}><Trash2/></Button>
                        </div>
                    ))}
                     <Button type="button" variant="outline" size="sm" onClick={() => appendEarning({ name: "", amount: 0 })}>
                        <PlusCircle className="mr-2"/>Add Earning
                    </Button>
                </CardContent>
            </Card>

            {/* Deductions */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg text-red-600">Deductions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     {deductionsFields.map((field, index) => (
                        <div key={field.id} className="flex gap-2 items-end">
                             <FormField
                                control={form.control}
                                name={`deductions.${index}.name`}
                                render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormLabel>Deduction #{index + 1}</FormLabel>
                                    <FormControl><Input placeholder="e.g., PF, TDS" {...field} /></FormControl>
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`deductions.${index}.amount`}
                                render={({ field }) => (
                                <FormItem>
                                    <FormControl><Input type="number" placeholder="Amount" {...field} /></FormControl>
                                </FormItem>
                                )}
                            />
                            <Button type="button" variant="destructive" size="icon" onClick={() => removeDeduction(index)}><Trash2/></Button>
                        </div>
                    ))}
                     <Button type="button" variant="outline" size="sm" onClick={() => appendDeduction({ name: "", amount: 0 })}>
                        <PlusCircle className="mr-2"/>Add Deduction
                    </Button>
                </CardContent>
            </Card>
        </div>
        
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
                <WalletCards className="mr-2" />
                Generate Salary Slip
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}

    