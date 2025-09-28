

import { createClient } from "@/lib/supabase/client";
const supabase = createClient();

export interface Feedback {
    id?: string;
    user_id: string;
    user_name: string;
    user_role: string;
    class?: string;
    category: "Complaint" | "Suggestion" | "Feedback";
    subject: string;
    description: string;
    created_at?: string;
    status?: "Pending" | "Reviewed"; // Added status for tracking
}


export const FEEDBACK_TABLE_SETUP_SQL = `
-- Creates the table for storing user-submitted feedback and complaints.
DROP TABLE IF EXISTS public.feedback;
CREATE TABLE public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    class TEXT,
    category TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for the feedback table
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist to prevent conflicts
DROP POLICY IF EXISTS "Allow authenticated users to submit feedback" ON public.feedback;
DROP POLICY IF EXISTS "Allow principal to read all feedback" ON public.feedback;
DROP POLICY IF EXISTS "Allow class teachers to read feedback from their class" ON public.feedback;


-- Policy: Allow any authenticated user to insert their own feedback
CREATE POLICY "Allow authenticated users to submit feedback"
ON public.feedback FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Policy: Allow Principal/Accountant to read all feedback
CREATE POLICY "Allow principal to read all feedback"
ON public.feedback FOR SELECT
USING (auth.uid() IN ('6cc51c80-e098-4d6d-8450-5ff5931b7391', 'cf210695-e635-4363-aea5-740f2707a6d7'));

-- Policy: Allow class teachers to read feedback from their assigned class students
CREATE POLICY "Allow class teachers to read feedback from their class"
ON public.feedback FOR SELECT
USING (
    (SELECT role FROM public.teachers WHERE auth_uid = auth.uid()) = 'classTeacher'
    AND
    class = (SELECT class_teacher_of FROM public.teachers WHERE auth_uid = auth.uid())
);
`;


export const addFeedback = async (feedbackData: Omit<Feedback, 'id' | 'created_at' | 'status'>) => {
    const payload = {
        ...feedbackData,
        status: 'Pending'
    };
    const { error } = await supabase.from('feedback').insert([payload]);
    if (error) {
        console.error("Error adding feedback:", error);
        throw error;
    }
};

// For Class Teacher: Get feedback for their specific class
export const getFeedbackForClassTeacher = (classSection: string, callback: (feedback: Feedback[]) => void) => {
    const fetchFeedback = async () => {
        const { data, error } = await supabase.from('feedback')
            .select('*')
            .eq('class', classSection)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error(`Error fetching feedback for class ${classSection}:`, error);
            callback([]);
        } else {
            callback(data || []);
        }
    };
    
    const channel = supabase
        .channel(`feedback-class-${classSection}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback', filter: `class=eq.${classSection}` }, (payload) => {
            fetchFeedback();
        })
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                fetchFeedback();
            }
             if (err) {
                console.error('Real-time subscription error:', err);
            }
        });

    return channel;
};

// For Principal: Get all feedback
export const getAllFeedback = (callback: (feedback: Feedback[]) => void) => {
    const fetchAllFeedback = async () => {
        const { data, error } = await supabase.from('feedback')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching all feedback:", error);
            callback([]);
        } else {
            callback(data || []);
        }
    };

    const channel = supabase
        .channel('all-feedback')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback' }, (payload) => {
            fetchAllFeedback();
        })
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                fetchAllFeedback();
            }
             if (err) {
                console.error('Real-time subscription error:', err);
            }
        });

    return channel;
};

// Update feedback status or add comments (for teachers/principal)
export const updateFeedback = async (id: string, updates: Partial<Feedback>) => {
    const { error } = await supabase.from('feedback').update(updates).eq('id', id);
    if (error) {
        console.error("Error updating feedback:", error);
        throw error;
    }
};




