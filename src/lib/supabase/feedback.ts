
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

export const addFeedback = async (feedbackData: Omit<Feedback, 'id' | 'created_at'>) => {
    const { error } = await supabase.from('feedback').insert([feedbackData]);
    if (error) {
        console.error("Error adding feedback:", error);
        throw error;
    }
};
