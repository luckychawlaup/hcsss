
"use client";

import { useState, useMemo } from 'react';
import type { Student } from '@/lib/supabase/students';
import { promoteStudents } from '@/lib/supabase/students';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Loader2, Rocket, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const classes = ["Nursery", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th"];
const sections = ["A", "B", "C", "D"];
const academicYears = ["2024-2025", "2025-2026", "2026-2027"];

interface StudentPromotionProps {
  allStudents: Student[];
}

export default function StudentPromotion({ allStudents }: StudentPromotionProps) {
  const [fromClass, setFromClass] = useState<{ class: string; section: string } | null>(null);
  const [toClass, setToClass] = useState<{ class: string; section: string } | null>(null);
  const [academicYear, setAcademicYear] = useState<string>(academicYears[0]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isPromoting, setIsPromoting] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [promotionType, setPromotionType] = useState<'all' | 'selected' | null>(null);
  const { toast } = useToast();

  const studentsToPromote = useMemo(() => {
    if (!fromClass) return [];
    return allStudents.filter(s => s.class === fromClass.class && s.section === fromClass.section);
  }, [allStudents, fromClass]);

  const handleSelectionChange = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedStudents(checked ? studentsToPromote.map(s => s.id) : []);
  };

  const handlePromotionClick = (type: 'all' | 'selected') => {
    if (!fromClass || !toClass) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select both "From" and "To" classes.' });
      return;
    }
    if (type === 'selected' && selectedStudents.length === 0) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select at least one student to promote.' });
        return;
    }
    setPromotionType(type);
    setIsAlertOpen(true);
  };

  const executePromotion = async () => {
    if (!promotionType || !fromClass || !toClass) return;

    setIsPromoting(true);
    const studentIds = promotionType === 'all' ? studentsToPromote.map(s => s.id) : selectedStudents;

    try {
      await promoteStudents({
        studentIds,
        fromClass,
        toClass,
        academicYear,
      });

      toast({
        title: 'Promotion Successful!',
        description: `${studentIds.length} student(s) have been promoted to ${toClass.class}-${toClass.section}.`,
      });
      setSelectedStudents([]);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Promotion Failed', description: error.message });
    } finally {
      setIsPromoting(false);
      setIsAlertOpen(false);
      setPromotionType(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
             <Select onValueChange={(val) => setFromClass({ class: val.split('-')[0], section: val.split('-')[1] })}>
              <SelectTrigger>
                <SelectValue placeholder="Promote From Class..." />
              </SelectTrigger>
              <SelectContent>
                {classes.flatMap(c => sections.map(s => `${c}-${s}`)).map(cs => <SelectItem key={`from-${cs}`} value={cs}>{cs}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select onValueChange={(val) => setToClass({ class: val.split('-')[0], section: val.split('-')[1] })}>
              <SelectTrigger>
                <SelectValue placeholder="Promote To Class..." />
              </SelectTrigger>
              <SelectContent>
                 {classes.map(c => sections.map(s => `${c}-${s}`)).map(cs => <SelectItem key={`to-${cs}`} value={cs}>{cs}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Select value={academicYear} onValueChange={setAcademicYear}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {academicYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {fromClass && (
        <Card>
          <CardContent className="p-6">
            {studentsToPromote.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Students in {fromClass.class}-{fromClass.section}</h3>
                  <div className="flex items-center gap-4">
                     <Button variant="secondary" onClick={() => handlePromotionClick('selected')} disabled={isPromoting || selectedStudents.length === 0}>Promote Selected</Button>
                    <Button onClick={() => handlePromotionClick('all')} disabled={isPromoting}>Promote All</Button>
                  </div>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                           <Checkbox
                            checked={selectedStudents.length === studentsToPromote.length && studentsToPromote.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>SRN</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Father's Name</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentsToPromote.map(student => (
                        <TableRow key={student.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedStudents.includes(student.id)}
                              onCheckedChange={() => handleSelectionChange(student.id)}
                            />
                          </TableCell>
                          <TableCell>{student.srn}</TableCell>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>{student.father_name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
                <div className="text-center p-12 border-dashed border rounded-md">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">No students found</h3>
                    <p className="mt-1 text-sm text-gray-500">There are no students in {fromClass.class}-{fromClass.section}.</p>
                </div>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Promotion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to promote {promotionType === 'all' ? `all ${studentsToPromote.length}` : selectedStudents.length} student(s) from {fromClass?.class}-{fromClass?.section} to {toClass?.class}-{toClass?.section} for the {academicYear} session? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPromoting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executePromotion} disabled={isPromoting}>
              {isPromoting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
              Confirm & Promote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
