
"use server";
import { getPersonalizedStudyTips, PersonalizedStudyTipsOutput } from "@/ai/flows/personalized-study-tips";

export async function getAiTips(): Promise<PersonalizedStudyTipsOutput | { error: string }> {
  try {
    const tips = await getPersonalizedStudyTips({
      studentId: "student-123",
      academicPerformance: "Excels in Mathematics and Physics (avg. 95), struggles with History (avg. 65).",
      learningPreferences: "Visual learner, benefits from diagrams and videos. Prefers project-based learning.",
      goals: "Wants to pursue a career in engineering, possibly in aerospace."
    });
    return tips;
  } catch (e) {
    console.error(e);
    return { error: "Failed to generate personalized tips. Please try again later." };
  }
}
