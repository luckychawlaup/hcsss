
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
const SALARY_COLLECTION = 'salary_slips';

export interface SalarySlip {
    id: string;
    teacher_id: string;
    month: string; // e.g., "August 2024"
    basic_salary: number;
    earnings: { name: string; amount: number }[];
    deductions: { name: string; amount: number }[];
    net_salary: number;
    status: 'draft' | 'issued' | 'paid';
    created_at: string;
    issued_at?: string;
    paid_at?: string;
}

export const SALARY_TABLE_SETUP_SQL = `
CREATE TABLE IF NOT EXISTS public.salary_slips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    basic_salary NUMERIC NOT NULL,
    earnings JSONB,
    deductions JSONB,
    net_salary NUMERIC NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'issued', 'paid')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    issued_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    CONSTRAINT salary_slip_unique_teacher_month UNIQUE (teacher_id, month)
);

ALTER TABLE public.salary_slips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow principal/owner to manage salary slips" ON public.salary_slips;
DROP POLICY IF EXISTS "Allow teachers to view their own salary slips" ON public.salary_slips;

CREATE POLICY "Allow principal/owner to manage salary slips"
ON public.salary_slips FOR ALL
USING (
    (SELECT role FROM public.admin_roles WHERE uid = auth.uid()) IN ('principal', 'owner')
    OR
    (auth.uid() = '${process.env.NEXT_PUBLIC_OWNER_UID}')
);

CREATE POLICY "Allow teachers to view their own salary slips"
ON public.salary_slips FOR SELECT
USING (teacher_id = (SELECT id FROM public.teachers WHERE auth_uid = auth.uid()));
`;

export const addSalarySlip = async (slipData: Omit<SalarySlip, 'id' | 'created_at' | 'net_salary'>): Promise<string | null> => {
    const totalEarnings = slipData.basic_salary + slipData.earnings.reduce((acc, e) => acc + e.amount, 0);
    const totalDeductions = slipData.deductions.reduce((acc, d) => acc + d.amount, 0);
    const net_salary = totalEarnings - totalDeductions;
    
    const finalSlipData = { ...slipData, net_salary };

    const { data, error } = await supabase.from(SALARY_COLLECTION).insert([finalSlipData]).select('id').single();

    if (error) {
        console.error("Error adding salary slip:", error);
        throw error;
    }
    return data?.id || null;
};

export const getSalarySlipById = async (slipId: string): Promise<SalarySlip | null> => {
    const { data, error } = await supabase.from(SALARY_COLLECTION).select('*').eq('id', slipId).single();
    if(error) {
        console.error("Error fetching salary slip:", error);
        return null;
    }
    return data;
}

export const getSalarySlipsForTeacher = (teacherId: string, callback: (slips: SalarySlip[]) => void) => {
    const channel = supabase.channel(`salary-slips-${teacherId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: SALARY_COLLECTION, filter: `teacher_id=eq.${teacherId}` }, 
        async () => {
            const { data, error } = await supabase.from(SALARY_COLLECTION).select('*').eq('teacher_id', teacherId).order('created_at', { ascending: false });
            if(data) callback(data);
        }).subscribe(async (status) => {
             if (status === 'SUBSCRIBED') {
                const { data, error } = await supabase.from(SALARY_COLLECTION).select('*').eq('teacher_id', teacherId).order('created_at', { ascending: false });
                if(data) callback(data);
            }
        });

    return channel;
};
