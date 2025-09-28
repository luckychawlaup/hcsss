
"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "@/components/dashboard/Header";
import { createClient } from "@/lib/supabase/client";
import { Student, getStudentsAndPending, CombinedStudent } from "@/lib/supabase/students";
import { getFeesForAllStudents, updateFeeStatus, Fee, FeeStatus } from "@/lib/supabase/fees";
import { Skeleton } from "../ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, Circle, Edit, Save, Loader2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const classes = ["Nursery", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const sections = ["A", "B", "C", "D"];
const months = ["April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March"];

const StatusIcon = ({ status }: { status: FeeStatus }) => {
    switch (status) {
        case "paid": return <Check className="h-5 w-5 text-green-500" />;
        case "due": return <Circle className="h-5 w-5 text-yellow-500" />;
        case "overdue": return <X className="h-5 w-5 text-red-500" />;
        case "pending":
        default: return <Circle className="h-5 w-5 text-muted-foreground/30" />;
    }
}

export default function AccountantDashboard() {
    const [students, setStudents] = useState<CombinedStudent[]>([]);
    const [fees, setFees] = useState<Fee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [selectedSection, setSelectedSection] = useState<string | null>(null);
    const [editingCell, setEditingCell] = useState<{ studentId: string; month: string } | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setIsLoading(true);
        const unsubStudents = getStudentsAndPending(setStudents);
        const unsubFees = getFeesForAllStudents(setFees);
        
        const timer = setTimeout(() => setIsLoading(false), 1500);

        return () => {
            if (unsubStudents) unsubStudents();
            if (unsubFees) unsubFees.unsubscribe();
            clearTimeout(timer);
        };
    }, []);
    
    const filteredStudents = useMemo(() => {
        if (!selectedClass || !selectedSection) return [];
        return students.filter(s => s.class === selectedClass && s.section === selectedSection);
    }, [students, selectedClass, selectedSection]);

    const studentFeeMap = useMemo(() => {
        const map = new Map<string, Record<string, FeeStatus>>();
        fees.forEach(fee => {
            if (!map.has(fee.student_id)) {
                map.set(fee.student_id, {});
            }
            map.get(fee.student_id)![fee.month] = fee.status;
        });
        return map;
    }, [fees]);

    const handleStatusChange = async (studentId: string, month: string, newStatus: FeeStatus) => {
        setEditingCell(null);
        setIsUpdating(true);
        try {
            await updateFeeStatus(studentId, month, newStatus);
            toast({ title: "Success", description: "Fee status updated." });
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to update fee status." });
        } finally {
            setIsUpdating(false);
        }
    };
    
    const isCellLoading = (studentId: string, month: string) => {
        return isUpdating && editingCell?.studentId === studentId && editingCell?.month === month;
    }


    return (
        <div className="flex min-h-screen w-full flex-col bg-background">
            <Header title="Accountant Dashboard" showAvatar={false} />
            <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Student Fee Management</CardTitle>
                        <CardDescription>Select a class and section to view and manage student fee statuses.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4 mb-4">
                             <Select onValueChange={setSelectedClass}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Select Class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select onValueChange={setSelectedSection} disabled={!selectedClass}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Select Section" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {isLoading ? (
                             <Skeleton className="h-64 w-full" />
                        ) : selectedClass && selectedSection ? (
                            filteredStudents.length > 0 ? (
                            <div className="overflow-x-auto rounded-md border">
                                <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="sticky left-0 bg-background">Student Name</TableHead>
                                        {months.map(month => <TableHead key={month} className="text-center">{month}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredStudents.map(student => (
                                        <TableRow key={student.id}>
                                            <TableCell className="font-medium sticky left-0 bg-background">{student.name}</TableCell>
                                            {months.map(month => {
                                                const status = studentFeeMap.get(student.id)?.[month] || 'pending';
                                                return (
                                                    <TableCell key={month} className="text-center">
                                                        {isCellLoading(student.id, month) ? (
                                                            <Loader2 className="h-5 w-5 animate-spin mx-auto"/>
                                                        ) : (
                                                            <Select onValueChange={(newStatus) => handleStatusChange(student.id, month, newStatus as FeeStatus)} defaultValue={status}>
                                                                <SelectTrigger className={cn("w-28 mx-auto",
                                                                    status === 'paid' && "text-green-600",
                                                                    status === 'due' && "text-yellow-600",
                                                                    status === 'overdue' && "text-red-600"
                                                                )}>
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="pending"><Circle className="inline mr-2 h-4 w-4 text-muted-foreground/30"/>Pending</SelectItem>
                                                                    <SelectItem value="due"><Circle className="inline mr-2 h-4 w-4 text-yellow-500"/>Due</SelectItem>
                                                                    <SelectItem value="paid"><Check className="inline mr-2 h-4 w-4 text-green-500"/>Paid</SelectItem>
                                                                    <SelectItem value="overdue"><X className="inline mr-2 h-4 w-4 text-red-500"/>Overdue</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        )}
                                                    </TableCell>
                                                )
                                            })}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            </div>
                            ) : (
                                <div className="text-center p-12 border-dashed border rounded-md">
                                    <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                                    <h3 className="mt-2 text-sm font-semibold text-gray-900">No students found</h3>
                                    <p className="mt-1 text-sm text-gray-500">There are no students in {selectedClass}-{selectedSection}.</p>
                                </div>
                            )
                        ) : (
                            <div className="text-center p-12 border-dashed border rounded-md">
                                <p className="text-muted-foreground">Please select a class and section to view fee data.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
