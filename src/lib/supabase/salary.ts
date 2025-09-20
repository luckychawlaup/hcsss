
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
const SALARY_COLLECTION = 'salary_slips';

export interface SalarySlip {
    id: string;
    teacherId: string;
    month: string; // e.g., "August 2024"
    basicSalary: number;
    earnings: { name: string; amount: number }[];
    deductions: { name: string; amount: number }[];
    netSalary: number;
    status: 'Paid' | 'Pending';
    createdAt: string;
}

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
    const channel = supabase.channel(`salary-slips-teacher-${teacherId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: SALARY_COLLECTION, filter: `teacherId=eq.${teacherId}` }, 
        async () => {
            const { data, error } = await supabase.from(SALARY_COLLECTION).select('*').eq('teacherId', teacherId).order('createdAt', { ascending: false });
            if(data) callback(data);
        }).subscribe();
    
    (async () => {
        const { data, error } = await supabase.from(SALARY_COLLECTION).select('*').eq('teacherId', teacherId).order('createdAt', { ascending: false });
        if(data) callback(data);
    })();

    return channel;
};
