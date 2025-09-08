'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating personalized study tips for students.
 *
 * The flow takes student-specific context as input and uses a language model to generate tailored recommendations.
 * It exports:
 *   - `getPersonalizedStudyTips`: A function to trigger the flow.
 *   - `PersonalizedStudyTipsInput`: The input type for the flow.
 *   - `PersonalizedStudyTipsOutput`: The output type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input schema for the personalized study tips flow
const PersonalizedStudyTipsInputSchema = z.object({
  studentId: z.string().describe('The unique identifier of the student.'),
  academicPerformance: z
    .string()
    .describe(
      'A summary of the student\'s academic performance, including grades, subjects, and areas of strength and weakness.'
    ),
  learningPreferences: z
    .string()
    .describe(
      'Information about the student\'s preferred learning style, such as visual, auditory, or kinesthetic.'
    ),
  goals: z.string().describe('The student\'s academic and career goals.'),
});
export type PersonalizedStudyTipsInput = z.infer<
  typeof PersonalizedStudyTipsInputSchema
>;

// Define the output schema for the personalized study tips flow
const PersonalizedStudyTipsOutputSchema = z.object({
  studyTips: z
    .array(z.string())
    .describe('A list of personalized study tips for the student.'),
  suggestedResources: z
    .array(z.string())
    .describe('A list of suggested learning resources for the student.'),
  possibleCareerPaths: z
    .array(z.string())
    .describe(
      'Suggested career paths based on the student\'s current goals and academic performance'
    ),
});
export type PersonalizedStudyTipsOutput = z.infer<
  typeof PersonalizedStudyTipsOutputSchema
>;

// Exported function to call the flow
export async function getPersonalizedStudyTips(
  input: PersonalizedStudyTipsInput
): Promise<PersonalizedStudyTipsOutput> {
  return personalizedStudyTipsFlow(input);
}

// Define the prompt for generating personalized study tips
const personalizedStudyTipsPrompt = ai.definePrompt({
  name: 'personalizedStudyTipsPrompt',
  input: {schema: PersonalizedStudyTipsInputSchema},
  output: {schema: PersonalizedStudyTipsOutputSchema},
  prompt: `You are an AI assistant providing personalized study tips, resources, and potential career paths to students.

  Based on the following student information, generate a list of study tips, suggested learning resources, and possible career paths.

  Student ID: {{{studentId}}}
  Academic Performance: {{{academicPerformance}}}
  Learning Preferences: {{{learningPreferences}}}
  Goals: {{{goals}}}

  Study Tips:
  Suggested Resources:
  Possible Career Paths:`,
});

// Define the Genkit flow for generating personalized study tips
const personalizedStudyTipsFlow = ai.defineFlow(
  {
    name: 'personalizedStudyTipsFlow',
    inputSchema: PersonalizedStudyTipsInputSchema,
    outputSchema: PersonalizedStudyTipsOutputSchema,
  },
  async input => {
    const {output} = await personalizedStudyTipsPrompt(input);
    return output!;
  }
);
