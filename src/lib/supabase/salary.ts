
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
const SALARY_COLLECTION = 'salary_slips';

export interface SalarySlip {
    id: string;
    teacher_id: string;
    month: string; // e.g., "August 2024"
    basicSalary: number;
    earnings: { name: string; amount: number }[];
    deductions: { name: string; amount: number }[];
    netSalary: number;
    status: 'Paid' | 'Pending';
    createdAt: string;
}

export const SALARY_TABLE_SETUP_SQL = `
CREATE TABLE IF NOT EXISTS public.salary_slips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    "basicSalary" NUMERIC NOT NULL,
    earnings JSONB,
    deductions JSONB,
    "netSalary" NUMERIC NOT NULL,
    status TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.salary_slips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow principal/owner to manage salary slips" ON public.salary_slips;
DROP POLICY IF EXISTS "Allow teachers to view their own salary slips" ON public.salary_slips;

CREATE POLICY "Allow principal/owner to manage salary slips"
ON public.salary_slips FOR ALL
USING (
    (SELECT role FROM public.admin_roles WHERE uid = auth.uid()) IN ('principal', 'owner')
    OR
    (auth.uid() = '8ca56ec5-5e29-444f-931a-7247d65da329')
);

CREATE POLICY "Allow teachers to view their own salary slips"
ON public.salary_slips FOR SELECT
USING (teacher_id = (SELECT id FROM public.teachers WHERE auth_uid = auth.uid()));
`;

export const addSalarySlip = async (slipData: Omit<SalarySlip, 'id' | 'createdAt' | 'netSalary'>): Promise<string | null> => {
    const totalEarnings = slipData.basicSalary + slipData.earnings.reduce((acc, e) => acc + e.amount, 0);
    const totalDeductions = slipData.deductions.reduce((acc, d) => acc + d.amount, 0);
    const netSalary = totalEarnings - totalDeductions;
    
    const finalSlipData = { ...slipData, netSalary };

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
            const { data, error } = await supabase.from(SALARY_COLLECTION).select('*').eq('teacher_id', teacherId).order('createdAt', { ascending: false });
            if(data) callback(data);
        }).subscribe(async (status) => {
             if (status === 'SUBSCRIBED') {
                const { data, error } = await supabase.from(SALARY_COLLECTION).select('*').eq('teacher_id', teacherId).order('createdAt', { ascending: false });
                if(data) callback(data);
            }
        });

    return channel;
};
