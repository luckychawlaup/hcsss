import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";

const reports = [
  { term: "Mid-Term Exam", year: "2024", url: "#" },
  { term: "Final Exam", year: "2023", url: "#" },
  { term: "Mid-Term Exam", year: "2023", url: "#" },
];

export default function ReportCardComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <FileText className="h-6 w-6" />
          Report Cards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {reports.map((report, index) => (
          <div
            key={index}
            className="flex items-center justify-between rounded-md border p-3"
          >
            <div>
              <p className="font-semibold">{report.term}</p>
              <p className="text-sm text-muted-foreground">{report.year}</p>
            </div>
            <Button variant="outline" size="icon" asChild>
              <a href={report.url} download>
                <Download className="h-4 w-4" />
                <span className="sr-only">Download</span>
              </a>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
