
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const FEES_TABLE = 'fees';

export type FeeStatus = "paid" | "due" | "overdue" | "pending";

export interface Fee {
    id?: string;
    student_id: string;
    month: string;
    status: FeeStatus;
    amount: number;
    updated_at?: string;
}

export const FEES_TABLE_SETUP_SQL = `
CREATE TABLE IF NOT EXISTS public.fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    amount INTEGER NOT NULL DEFAULT 5000,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fees_unique_student_month UNIQUE (student_id, month)
);

ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow accountants to manage fees" ON public.fees;
DROP POLICY IF EXISTS "Allow students to view their own fees" ON public.fees;

CREATE POLICY "Allow accountants to manage fees"
ON public.fees FOR ALL
USING ((SELECT role FROM public.admin_roles WHERE uid = auth.uid()) = 'accountant');

CREATE POLICY "Allow students to view their own fees"
ON public.fees FOR SELECT
USING (auth.uid() = (SELECT auth_uid FROM public.students WHERE id = student_id));
`;

// For Accountant: Get all fee records
export const getFeesForAllStudents = (callback: (fees: Fee[]) => void) => {
    const fetchFees = async () => {
        const { data, error } = await supabase.from(FEES_TABLE).select('*');
        if (error) {
            console.error("Error fetching all fees:", error);
            callback([]);
        } else {
            callback(data || []);
        }
    };
    
    const channel = supabase
        .channel('all-fees')
        .on('postgres_changes', { event: '*', schema: 'public', table: FEES_TABLE },
        (payload) => {
            fetchFees();
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                fetchFees();
            }
        });

    return channel;
};

// For Accountant: Update a fee status
export const updateFeeStatus = async (studentId: string, month: string, status: FeeStatus) => {
    const { data, error } = await supabase
        .from(FEES_TABLE)
        .upsert(
            { student_id: studentId, month: month, status: status, amount: 5000 },
            { onConflict: 'student_id,month' }
        );
    if (error) throw error;
    return data;
};

// For Student: Get their own fee records
export const getFeesForStudent = (studentId: string, callback: (fees: Fee[]) => void) => {
    const fetchFees = async () => {
        const { data, error } = await supabase.from(FEES_TABLE).select('*').eq('student_id', studentId);
        if (error) {
            console.error(`Error fetching fees for student ${studentId}:`, error);
            callback([]);
        } else {
            callback(data || []);
        }
    };

    const channel = supabase
        .channel(`fees-student-${studentId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: FEES_TABLE, filter: `student_id=eq.${studentId}`},
        (payload) => {
            fetchFees();
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                fetchFees();
            }
        });

    return channel;
}
