
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
-- Create the school_holidays table to store dates when the school is closed.
CREATE TABLE IF NOT EXISTS public.school_holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    description TEXT NOT NULL,
    class_section TEXT, -- If NULL, it's a school-wide holiday
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT holiday_unique_per_scope UNIQUE(date, class_section)
);

-- Enable RLS for the holidays table
ALTER TABLE public.school_holidays ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist to prevent conflicts
DROP POLICY IF EXISTS "Allow admins to manage holidays" ON public.school_holidays;
DROP POLICY IF EXISTS "Allow class teachers to manage their class holidays" ON public.school_holidays;
DROP POLICY IF EXISTS "Allow authenticated users to read holidays" ON public.school_holidays;

-- Policy: Allow Principal/Owner to manage all holidays (school-wide and class-specific)
CREATE POLICY "Allow admins to manage holidays"
ON public.school_holidays FOR ALL
USING (
    (SELECT role FROM public.admin_roles WHERE uid = auth.uid()) IN ('principal', 'owner')
    OR
    (auth.uid() = '6bed2c29-8ac9-4e2b-b9ef-26877d42f050') -- Owner UID
)
WITH CHECK (
    (SELECT role FROM public.admin_roles WHERE uid = auth.uid()) IN ('principal', 'owner')
    OR
    (auth.uid() = '6bed2c29-8ac9-4e2b-b9ef-26877d42f050') -- Owner UID
);

-- Policy: Allow Class Teachers to manage holidays for their specific class
CREATE POLICY "Allow class teachers to manage their class holidays"
ON public.school_holidays FOR ALL
USING (
    (SELECT role FROM public.teachers WHERE auth_uid = auth.uid()) = 'classTeacher'
    AND
    class_section = (SELECT class_teacher_of FROM public.teachers WHERE auth_uid = auth.uid())
)
WITH CHECK (
    (SELECT role FROM public.teachers WHERE auth_uid = auth.uid()) = 'classTeacher'
    AND
    class_section = (SELECT class_teacher_of FROM public.teachers WHERE auth_uid = auth.uid())
);


-- Policy: Allow any authenticated user to read relevant holidays
CREATE POLICY "Allow authenticated users to read holidays"
ON public.school_holidays FOR SELECT
USING (
    auth.role() = 'authenticated'
);
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
