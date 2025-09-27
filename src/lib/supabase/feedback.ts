
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();

export interface Feedback {
    id?: string;
    user_id: string;
    user_name: string;
    user_role: string;
    category: "Complaint" | "Suggestion" | "Feedback";
    subject: string;
    description: string;
    created_at?: string;
}


export const FEEDBACK_TABLE_SETUP_SQL = `
-- Creates the table for storing user-submitted feedback and complaints.
-- This allows any authenticated user to submit feedback.
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    category TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for the feedback table
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist to prevent conflicts
DROP POLICY IF EXISTS "Allow authenticated users to submit feedback" ON public.feedback;
DROP POLICY IF EXISTS "Allow admin to read all feedback" ON public.feedback;


-- Policy: Allow any authenticated user to insert feedback
CREATE POLICY "Allow authenticated users to submit feedback"
ON public.feedback FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Policy: Allow admin roles to read all feedback
CREATE POLICY "Allow admin to read all feedback"
ON public.feedback FOR SELECT
USING (
    auth.uid() IN (
        '6cc51c80-e098-4d6d-8450-5ff5931b7391', -- Principal UID
        '946ba406-1ba6-49cf-ab78-f611d1350f33'  -- Owner UID
    )
);
`;


export const addFeedback = async (feedbackData: Omit<Feedback, 'id' | 'created_at'>) => {
    const { error } = await supabase.from('feedback').insert([feedbackData]);
    if (error) {
        console.error("Error adding feedback:", error);
        throw error;
    }
};
