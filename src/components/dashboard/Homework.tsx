"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BookOpen, Download } from "lucide-react";

const homeworks = [
  {
    subject: "Mathematics",
    assignment: "Chapter 5: Algebra",
    dueDate: "2024-08-15",
    attachment: true,
  },
  {
    subject: "Physics",
    assignment: "Laws of Motion worksheet",
    dueDate: "2024-08-18",
    attachment: true,
  },
  {
    subject: "History",
    assignment: "Essay on the Mughal Empire",
    dueDate: "2024-08-20",
    attachment: false,
  },
  {
    subject: "English",
    assignment: "Read 'To Kill a Mockingbird'",
    dueDate: "2024-08-22",
    attachment: false,
  },
];

export default function Homework() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-primary">
          <BookOpen className="h-6 w-6" />
          Today's Homework
        </CardTitle>
        <Button variant="ghost" size="sm">
          View All
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Assignment</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Attachment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {homeworks.map((hw, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{hw.subject}</TableCell>
                  <TableCell>{hw.assignment}</TableCell>
                  <TableCell>{hw.dueDate}</TableCell>
                  <TableCell className="text-right">
                    {hw.attachment && (
                      <Button variant="outline" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
