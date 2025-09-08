import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { UserCheck } from "lucide-react";

export default function Attendance() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <UserCheck className="h-6 w-6" />
          Attendance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-2">
            <p className="text-muted-foreground">Overall</p>
            <p className="font-bold">92%</p>
        </div>
        <Progress value={92} />
        <p className="text-sm text-muted-foreground mt-2">Last updated today</p>
      </CardContent>
    </Card>
  );
}
