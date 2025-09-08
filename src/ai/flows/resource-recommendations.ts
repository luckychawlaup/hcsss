// Resource Recommendations Flow
'use server';

/**
 * @fileOverview Provides personalized resource recommendations to students based on their subjects and performance.
 *
 * - `getResourceRecommendations` - A function that returns learning resource recommendations.
 * - `ResourceRecommendationsInput` - The input type for the `getResourceRecommendations` function.
 * - `ResourceRecommendationsOutput` - The return type for the `getResourceRecommendations` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ResourceRecommendationsInputSchema = z.object({
  subjects: z
    .array(z.string())
    .describe('List of subjects the student is studying.'),
  performance: z
    .record(z.string(), z.number())
    .describe(
      'A map of subject to performance (0-100), higher number represents better performance.'
    ),
  interests: z
    .array(z.string())
    .describe('List of student interests, for example "Chess", "Debate"')
    .optional(),
});
export type ResourceRecommendationsInput = z.infer<
  typeof ResourceRecommendationsInputSchema
>;

const ResourceRecommendationsOutputSchema = z.object({
  recommendations: z.array(
    z.object({
      resourceName: z.string().describe('The name of the resource.'),
      resourceLink: z.string().describe('The link to the resource.'),
      reason: z
        .string()
        .describe('The reason why this resource is recommended.'),
    })
  ),
});

export type ResourceRecommendationsOutput = z.infer<
  typeof ResourceRecommendationsOutputSchema
>;

export async function getResourceRecommendations(
  input: ResourceRecommendationsInput
): Promise<ResourceRecommendationsOutput> {
  return resourceRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'resourceRecommendationsPrompt',
  input: {schema: ResourceRecommendationsInputSchema},
  output: {schema: ResourceRecommendationsOutputSchema},
  prompt: `You are an AI assistant providing personalized learning resource recommendations to students.

  Consider the student's subjects, performance in those subjects, and interests when making recommendations. Only recommend resources that are appropriate for the user's context. Do not make up resources; only suggest real resources.

  Subjects: {{subjects}}
  Performance: {{performance}}
  Interests: {{interests}}

  Provide a list of recommended resources, including the resource name, a link to the resource, and a brief explanation of why it is recommended.
  `,
});

const resourceRecommendationsFlow = ai.defineFlow(
  {
    name: 'resourceRecommendationsFlow',
    inputSchema: ResourceRecommendationsInputSchema,
    outputSchema: ResourceRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
