
"use client";

import { useState } from "react";
import type { Teacher } from "@/lib/firebase/teachers";
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
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Loader2, Landmark, Wallet, Edit, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateTeacher } from "@/lib/firebase/teachers";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


const bankAccountSchema = z.object({
  accountHolderName: z.string().min(2, "Account holder name is required."),
  accountNumber: z.string().min(8, "Valid account number is required.").regex(/^\d+$/, "Account number must be numeric."),
  ifscCode: z.string().length(11, "IFSC code must be 11 characters.").regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format."),
  bankName: z.string().min(3, "Bank name is required."),
});

const salaryHistory = [
    { month: "July 2024", amount: "₹50,000", status: "Paid"},
    { month: "June 2024", amount: "₹50,000", status: "Paid"},
    { month: "May 2024", amount: "₹50,000", status: "Paid"},
];

interface SalaryDetailsProps {
  teacher: Teacher | null;
}

export function SalaryDetails({ teacher }: SalaryDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof bankAccountSchema>>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      accountHolderName: teacher?.bankAccount?.accountHolderName || "",
      accountNumber: teacher?.bankAccount?.accountNumber || "",
      ifscCode: teacher?.bankAccount?.ifscCode || "",
      bankName: teacher?.bankAccount?.bankName || "",
    },
  });

  const { formState: { isSubmitting } } = form;

  const onSubmit = async (values: z.infer<typeof bankAccountSchema>) => {
    if (!teacher) return;
    try {
        await updateTeacher(teacher.id, { bankAccount: values });
        toast({
            title: "Bank Details Updated",
            description: "Your bank account details have been saved successfully."
        });
        setIsEditing(false);
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: "Could not update your bank details. Please try again."
        });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                 <CardTitle className="flex items-center gap-2 text-base">
                    <Landmark />
                    Bank Account Details
                </CardTitle>
                <CardDescription>
                    Your salary will be credited here.
                </CardDescription>
            </div>
            {!isEditing && teacher?.id && (
                 <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="mr-2 h-4 w-4" /> Edit
                </Button>
            )}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="accountHolderName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Holder Name</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!isEditing || isSubmitting} placeholder="As per bank records" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Number</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!isEditing || isSubmitting} placeholder="e.g. 123456789012" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ifscCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IFSC Code</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!isEditing || isSubmitting} placeholder="e.g. SBIN0001234" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Name</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!isEditing || isSubmitting} placeholder="e.g. State Bank of India" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isEditing && (
                <div className="flex gap-2">
                    <Button type="button" variant="ghost" onClick={() => { setIsEditing(false); form.reset(); }} disabled={isSubmitting}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                         Save Changes
                    </Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
       <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Wallet />
                    Salary History
                </CardTitle>
                 <CardDescription>
                    Your salary payment records.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Month</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {salaryHistory.map(record => (
                             <TableRow key={record.month}>
                                <TableCell>{record.month}</TableCell>
                                <TableCell>{record.amount}</TableCell>
                                <TableCell className="text-green-600">{record.status}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
      </Card>
    </div>
  );
}
