
import { createClient } from "@/lib/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";

const supabase = createClient();
const HOLIDAYS_TABLE = 'school_holidays';

export interface Holiday {
  date: string; // YYYY-MM-DD
  description: string;
}

export const HOLIDAYS_TABLE_SETUP_SQL = `
-- Create the school_holidays table to store dates when the school is closed.
CREATE TABLE IF NOT EXISTS public.school_holidays (
    date DATE PRIMARY KEY,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for the holidays table
ALTER TABLE public.school_holidays ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist to prevent conflicts
DROP POLICY IF EXISTS "Allow admins to manage holidays" ON public.school_holidays;
DROP POLICY IF EXISTS "Allow authenticated users to read holidays" ON public.school_holidays;

-- Policy: Allow admin roles (Principal/Owner) to manage holidays
CREATE POLICY "Allow admins to manage holidays"
ON public.school_holidays FOR ALL
USING (
    auth.uid() IN (
        '6cc51c80-e098-4d6d-8450-5ff5931b7391', -- Principal UID
        '946ba406-1ba6-49cf-ab78-f611d1350f33'  -- Owner UID
    )
)
WITH CHECK (
    auth.uid() IN (
        '6cc51c80-e098-4d6d-8450-5ff5931b7391', -- Principal UID
        '946ba406-1ba6-49cf-ab78-f611d1350f33'  -- Owner UID
    )
);

-- Policy: Allow any authenticated user to read the holiday list
CREATE POLICY "Allow authenticated users to read holidays"
ON public.school_holidays FOR SELECT
USING (auth.role() = 'authenticated');
`;

// Add a new holiday
export const addHoliday = async (holiday: Holiday): Promise<void> => {
    const { error } = await supabase.from(HOLIDAYS_TABLE).insert([holiday]);
    if (error) {
        console.error("Error adding holiday:", error);
        throw error;
    }
};

// Delete a holiday by its date
export const deleteHoliday = async (date: string): Promise<void> => {
    const { error } = await supabase.from(HOLIDAYS_TABLE).delete().eq('date', date);
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
        .channel('school-holidays-channel')
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
        .channel(`school-holidays-month-${format(month, 'yyyy-MM')}`)
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
