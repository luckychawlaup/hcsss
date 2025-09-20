
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const EXAMS_COLLECTION = 'exams';

export interface Exam {
    id: string;
    name: string;
    date: string;
    maxMarks: number;
}

export const getExams = (callback: (exams: Exam[]) => void) => {
    const channel = supabase
        .channel('exams-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: EXAMS_COLLECTION }, (payload) => {
            (async () => {
                 const { data, error } = await supabase.from(EXAMS_COLLECTION).select('*');
                 if(data) callback(data);
            })();
        })
        .subscribe();
    
     (async () => {
        const { data, error } = await supabase.from(EXAMS_COLLECTION).select('*');
        if(data) callback(data);
    })();
    
    return channel;
};

export const prepopulateExams = async () => {
    const { data: existingExams, error: fetchError } = await supabase.from(EXAMS_COLLECTION).select('id').limit(1);
    if(fetchError) console.error("Error checking for existing exams:", fetchError);

    if (!existingExams || existingExams.length === 0) {
        const initialExams = [
            { id: "mid-term-2024", name: "Mid-Term Exam 2024", date: new Date("2024-09-15").toISOString(), maxMarks: 100 },
            { id: "final-exam-2024", name: "Final Exam 2024", date: new Date("2025-03-10").toISOString(), maxMarks: 100 },
        ];
        
        const { error } = await supabase.from(EXAMS_COLLECTION).insert(initialExams);
        if (error) console.error("Error prepopulating exams:", error);
    }
};
