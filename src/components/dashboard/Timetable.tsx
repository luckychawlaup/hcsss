import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { CalendarDays } from "lucide-react";

const schedule = [
  { time: "09:00", subject: "Mathematics" },
  { time: "10:00", subject: "Physics" },
  { time: "11:00", subject: "Break" },
  { time: "11:30", subject: "History" },
  { time: "12:30", subject: "English" },
];

export default function Timetable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <CalendarDays className="h-6 w-6" />
          Today's Timetable
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Subject</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedule.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{item.time}</TableCell>
                <TableCell>{item.subject}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
