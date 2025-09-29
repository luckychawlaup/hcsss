

import { createClient } from "@/lib/supabase/client";
const supabase = createClient();

export type FeedbackStatus = "Pending" | "Resolving" | "Solved" | "Incomplete Details";

export interface Feedback {
    id?: string;
    user_id: string;
    user_name: string;
    user_role: string;
    class?: string;
    category: "General Issues" | "Academic Concerns" | "Student Record Issues" | "Fee-related Issues" | "Discipline & Behaviour" | "Facilities & Infrastructure" | "School Portal / IT Issues" | "Suggestions & Ideas" | "Feedback";
    subject: string;
    description: string;
    created_at?: string;
    status: FeedbackStatus;
    comment?: string;
}


export const FEEDBACK_TABLE_SETUP_SQL = `
-- Re-create the table to ensure the 'class' and 'comment' columns are added and status has new values
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
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Resolving', 'Solved', 'Incomplete Details')),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for the feedback table
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to submit feedback" ON public.feedback;
DROP POLICY IF EXISTS "Allow admins and teachers to manage feedback" ON public.feedback;
DROP POLICY IF EXISTS "Allow users to read their own feedback" ON public.feedback;


-- Policy: Allow any authenticated user to insert their own feedback
CREATE POLICY "Allow authenticated users to submit feedback"
ON public.feedback FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Policy: Allow users to read their own feedback
CREATE POLICY "Allow users to read their own feedback"
ON public.feedback FOR SELECT
USING (auth.uid() = user_id);


-- Policy: Allow Principal, Accountant, and Teachers to read and update feedback
CREATE POLICY "Allow admins and teachers to manage feedback"
ON public.feedback FOR ALL
USING (
  (SELECT auth.uid() from public.teachers where auth_uid = auth.uid()) IS NOT NULL
  OR
  (SELECT auth.uid() from public.admin_roles where uid = auth.uid()) IS NOT NULL
);
`;


export const addFeedback = async (feedbackData: Omit<Feedback, 'id' | 'created_at' | 'status' | 'comment'>) => {
    const payload = {
        ...feedbackData,
        status: 'Pending' as FeedbackStatus
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

// For Principal/Accountant: Get all feedback
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

// For currently logged-in user (student or teacher)
export const getFeedbackForUser = (userId: string, callback: (feedback: Feedback[]) => void) => {
    const fetchUserFeedback = async () => {
        const { data, error } = await supabase
            .from('feedback')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching user feedback:', error);
            callback([]);
        } else {
            callback(data || []);
        }
    };

    const channel = supabase
        .channel(`feedback-user-${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback', filter: `user_id=eq.${userId}` }, (payload) => {
            fetchUserFeedback();
        })
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                fetchUserFeedback();
            }
            if (err) {
                console.error('Real-time subscription error on user feedback:', err);
            }
        });
    
    return channel;
};


// Update feedback status or add comments (for teachers/principal)
export const updateFeedback = async (id: string, updates: Partial<{status: FeedbackStatus, comment?: string}>) => {
    const { error } = await supabase.from('feedback').update(updates).eq('id', id);
    if (error) {
        console.error("Error updating feedback:", error);
        throw error;
    }
};
