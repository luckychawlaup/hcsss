
"use client";

import type { Teacher } from "./PrincipalDashboard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "../ui/badge";

interface TeacherListProps {
  teachers: Teacher[];
}

export function TeacherList({ teachers }: TeacherListProps) {
  if (teachers.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-md border border-dashed p-8">
        <p className="text-muted-foreground">No teachers have been added yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Teacher ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Class Teacher</TableHead>
            <TableHead>Phone</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teachers.map((teacher) => (
            <TableRow key={teacher.id}>
              <TableCell className="font-mono">{teacher.id}</TableCell>
              <TableCell className="font-medium">{teacher.name}</TableCell>
              <TableCell>{teacher.subject}</TableCell>
              <TableCell>
                {teacher.classTeacherOf ? (
                  <Badge variant="secondary">{teacher.classTeacherOf}</Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>{teacher.phoneNumber}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
