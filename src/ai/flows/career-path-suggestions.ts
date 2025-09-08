'use server';

/**
 * @fileOverview Career path suggestions based on student interests and academic strengths.
 *
 * - suggestCareerPaths - A function that generates career path suggestions.
 * - CareerPathSuggestionsInput - The input type for the suggestCareerPaths function.
 * - CareerPathSuggestionsOutput - The return type for the suggestCareerPaths function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CareerPathSuggestionsInputSchema = z.object({
  interests: z
    .string()
    .describe('The students interests, comma separated, e.g. Art, Music, Sports'),
  academicStrengths: z
    .string()
    .describe('The students academic strengths, comma separated, e.g. Math, Science, Writing'),
});

export type CareerPathSuggestionsInput = z.infer<
  typeof CareerPathSuggestionsInputSchema
>;

const CareerPathSuggestionsOutputSchema = z.object({
  careerPaths: z
    .array(z.string())
    .describe('An array of suggested career paths based on the students interests and academic strengths.'),
});

export type CareerPathSuggestionsOutput = z.infer<
  typeof CareerPathSuggestionsOutputSchema
>;

export async function suggestCareerPaths(
  input: CareerPathSuggestionsInput
): Promise<CareerPathSuggestionsOutput> {
  return careerPathSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'careerPathSuggestionsPrompt',
  input: {schema: CareerPathSuggestionsInputSchema},
  output: {schema: CareerPathSuggestionsOutputSchema},
  prompt: `You are a career counselor providing personalized career path suggestions to students.

  Based on the student's interests and academic strengths, suggest a few potential career paths.
  Return the career paths as a JSON array of strings.

  Student Interests: {{{interests}}}
  Academic Strengths: {{{academicStrengths}}}`,
});

const careerPathSuggestionsFlow = ai.defineFlow(
  {
    name: 'careerPathSuggestionsFlow',
    inputSchema: CareerPathSuggestionsInputSchema,
    outputSchema: CareerPathSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
