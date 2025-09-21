
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
    try {
        const { data: existingExams, error: fetchError } = await supabase.from(EXAMS_COLLECTION).select('id').limit(1);
        if(fetchError) {
             // This can happen if the table doesn't exist yet, which is fine.
            console.warn("Could not check for existing exams, proceeding with prepopulation attempt.", fetchError.message);
        }

        if (!existingExams || existingExams.length === 0) {
            const initialExams = [
                { id: "mid-term-2024", name: "Mid-Term Exam 2024", date: new Date("2024-09-15").toISOString(), max_marks: 100 },
                { id: "final-exam-2024", name: "Final Exam 2024", date: new Date("2025-03-10").toISOString(), max_marks: 100 },
            ];
            
            console.log("Prepopulating exams...");
            const { error } = await supabase.from(EXAMS_COLLECTION).insert(initialExams);
            if (error) {
                console.error("Error prepopulating exams:", error);
            } else {
                console.log("Successfully prepopulated exams.");
            }
        }
    } catch (e) {
        console.error("An unexpected error occurred during exam prepopulation:", e);
    }
};
