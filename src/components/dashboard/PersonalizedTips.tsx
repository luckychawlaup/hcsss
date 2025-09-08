"use client";
import { useEffect, useState } from "react";
import { getAiTips } from "@/app/actions";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb, AlertCircle } from "lucide-react";
import type { PersonalizedStudyTipsOutput } from "@/ai/flows/personalized-study-tips";

type AiTipsData = PersonalizedStudyTipsOutput | null;
type AiTipsError = { error: string } | null;

export default function PersonalizedTips() {
  const [data, setData] = useState<AiTipsData>(null);
  const [error, setError] = useState<AiTipsError>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTips = async () => {
      setIsLoading(true);
      setError(null);
      const result = await getAiTips();
      if ("error" in result) {
        setError(result);
        setData(null);
      } else {
        setData(result);
      }
      setIsLoading(false);
    };

    fetchTips();
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center rounded-md bg-destructive/90 p-4 text-destructive-foreground">
          <AlertCircle className="h-8 w-8 mb-2" />
          <p className="font-semibold">An Error Occurred</p>
          <p className="text-sm text-center">{error.error}</p>
        </div>
      );
    }

    if (data) {
      return (
        <Accordion type="single" collapsible className="w-full">
          {data.studyTips?.length > 0 && (
            <AccordionItem value="study-tips">
              <AccordionTrigger>Study Tips</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc space-y-2 pl-5">
                  {data.studyTips.map((tip, i) => (
                    <li key={`tip-${i}`}>{tip}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          )}
          {data.suggestedResources?.length > 0 && (
            <AccordionItem value="resources">
              <AccordionTrigger>Suggested Resources</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc space-y-2 pl-5">
                  {data.suggestedResources.map((res, i) => (
                    <li key={`res-${i}`}>{res}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          )}
          {data.possibleCareerPaths?.length > 0 && (
            <AccordionItem value="career-paths">
              <AccordionTrigger>Possible Career Paths</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc space-y-2 pl-5">
                  {data.possibleCareerPaths.map((path, i) => (
                    <li key={`path-${i}`}>{path}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      );
    }

    return null;
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Lightbulb className="h-6 w-6" />
          Personalized Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}
