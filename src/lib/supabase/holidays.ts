
import { createClient } from "@/lib/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";

const supabase = createClient();
const HOLIDAYS_TABLE = 'school_holidays';

export interface Holiday {
  id?: string;
  date: string; // YYYY-MM-DD
  description: string;
  class_section?: string | null; // e.g., "10-A" or null for school-wide
}

export const HOLIDAYS_TABLE_SETUP_SQL = `
-- Drop the table and its dependent policies completely to ensure a clean start.
DROP TABLE IF EXISTS public.school_holidays;

-- Recreate the school_holidays table.
CREATE TABLE public.school_holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    description TEXT NOT NULL,
    class_section TEXT, -- If NULL, it's a school-wide holiday
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT holiday_unique_per_scope UNIQUE(date, class_section)
);

-- Enable Row Level Security (RLS) on the newly created table.
ALTER TABLE public.school_holidays ENABLE ROW LEVEL SECURITY;

-- **NEW & CORRECTED POLICIES**

-- Policy: Allow Principal/Owner to manage all holidays.
CREATE POLICY "Allow admins to manage holidays"
ON public.school_holidays FOR ALL
USING (
    (SELECT role FROM public.admin_roles WHERE uid = auth.uid()) IN ('principal', 'owner')
    OR
    (auth.uid() = '${process.env.NEXT_PUBLIC_OWNER_UID}') -- Owner UID
);

-- Policy: Allow Class Teachers to manage holidays ONLY for their assigned class.
-- This version uses an EXISTS clause with a direct join condition to avoid ambiguity.
CREATE POLICY "Allow class teachers to manage their class holidays"
ON public.school_holidays FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.teachers t
        WHERE t.auth_uid = auth.uid()
          AND t.role = 'classTeacher'
          AND t.class_teacher_of = public.school_holidays.class_section
    )
);

-- Policy: Allow any authenticated user (students, teachers, etc.) to read holiday information.
CREATE POLICY "Allow authenticated users to read holidays"
ON public.school_holidays FOR SELECT
USING (auth.role() = 'authenticated');
`;

// Add a new holiday
export const addHoliday = async (holiday: Omit<Holiday, 'id'>): Promise<void> => {
    const { error } = await supabase.from(HOLIDAYS_TABLE).insert([holiday]);
    if (error) {
        console.error("Error adding holiday:", error);
        throw error;
    }
};

// Delete a holiday by its id
export const deleteHoliday = async (id: string): Promise<void> => {
    const { error } = await supabase.from(HOLIDAYS_TABLE).delete().eq('id', id);
    if (error) {
        console.error("Error deleting holiday:", error);
        throw error;
    }
};

// Get all holidays with real-time updates
export const getHolidays = (callback: (holidays: Holiday[]) => void) => {
    const fetchHolidays = async () => {
        const { data, error } = await supabase.from(HOLIDAYS_TABLE).select('*');
        if (error) {
            console.error("Error fetching holidays:", error);
            callback([]);
        } else {
            callback(data || []);
        }
    };

    const channel = supabase
        .channel('school-holidays')
        .on('postgres_changes', { event: '*', schema: 'public', table: HOLIDAYS_TABLE }, (payload) => {
            fetchHolidays();
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                fetchHolidays();
            }
        });

    return channel;
};

// Get holidays for a specific month
export const getHolidaysForMonth = (month: Date, callback: (holidays: Holiday[]) => void) => {
    const fromDate = format(startOfMonth(month), 'yyyy-MM-dd');
    const toDate = format(endOfMonth(month), 'yyyy-MM-dd');

    const fetchMonthHolidays = async () => {
        const { data, error } = await supabase
            .from(HOLIDAYS_TABLE)
            .select('*')
            .gte('date', fromDate)
            .lte('date', toDate);
        if (error) {
            console.error(`Error fetching holidays for ${format(month, 'MMMM yyyy')}:`, error);
            callback([]);
        } else {
            callback(data || []);
        }
    };

     const channel = supabase
        .channel(`holidays-month-${format(month, 'yyyy-MM')}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: HOLIDAYS_TABLE }, (payload) => {
            fetchMonthHolidays();
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                fetchMonthHolidays();
            }
        });
    
    return channel;
}
