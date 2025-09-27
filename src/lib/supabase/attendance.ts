
import { createClient } from "@/lib/supabase/client";
import { startOfMonth, endOfMonth, format } from "date-fns";

const supabase = createClient();
const ATTENDANCE_COLLECTION = 'attendance';

export interface AttendanceRecord {
    id: string;
    student_id: string;
    class_section: string;
    date: string; // ISO String
    status: 'present' | 'absent' | 'half-day';
    marked_by: string; // Teacher's ID from 'teachers' table
    created_at: string;
}

export const ATTENDANCE_TABLE_SETUP_SQL = `
-- Creates the table for storing daily attendance records and sets security rules.
-- This allows Class Teachers to mark attendance and students to view their own.
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_section TEXT NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'half-day')),
    marked_by UUID NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT attendance_unique_student_date UNIQUE (student_id, date)
);

-- Enable RLS for the attendance table
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist to prevent conflicts
DROP POLICY IF EXISTS "Allow teachers to manage attendance" ON public.attendance;
DROP POLICY IF EXISTS "Allow students to view their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Allow principal/owner to view all attendance" ON public.attendance;

-- Policy: Allow authenticated Class Teachers to manage attendance for their class
CREATE POLICY "Allow teachers to manage attendance"
ON public.attendance FOR ALL
USING (
    (SELECT role FROM public.teachers WHERE auth_uid = auth.uid()) = 'classTeacher' AND
    (SELECT class_teacher_of FROM public.teachers WHERE auth_uid = auth.uid()) = class_section
)
WITH CHECK (
    (SELECT role FROM public.teachers WHERE auth_uid = auth.uid()) = 'classTeacher' AND
    (SELECT class_teacher_of FROM public.teachers WHERE auth_uid = auth.uid()) = class_section
);

-- Policy: Allow students to view their own attendance records
CREATE POLICY "Allow students to view their own attendance"
ON public.attendance FOR SELECT
USING (
    auth.uid() = (SELECT auth_uid FROM public.students WHERE id = student_id)
);

-- Policy: Allow admin roles to view all attendance data
CREATE POLICY "Allow principal/owner to view all attendance"
ON public.attendance FOR SELECT
USING (
    auth.uid() IN (
        '6cc51c80-e098-4d6d-8450-5ff5931b7391', -- Principal UID
        '946ba406-1ba6-49cf-ab78-f611d1350f33'  -- Owner UID
    )
);
`;

// Upsert attendance records for a class on a specific date
export const setAttendance = async (records: Omit<AttendanceRecord, 'id' | 'created_at'>[]): Promise<void> => {
    if (!records || records.length === 0) {
        return;
    }
    const { error } = await supabase.from(ATTENDANCE_COLLECTION).upsert(records, {
        onConflict: 'student_id,date',
    });

    if (error) {
        console.error("Error setting attendance:", error);
        throw error;
    }
};

// Get attendance for a specific class on a specific date
export const getAttendanceForDate = async (classSection: string, date: string): Promise<AttendanceRecord[]> => {
    const { data, error } = await supabase
        .from(ATTENDANCE_COLLECTION)
        .select('*')
        .eq('class_section', classSection)
        .eq('date', date);

    if (error) {
        console.error("Error fetching attendance for date:", error);
        return [];
    }
    return data || [];
};

// Get a student's attendance for a given month with real-time updates
export const getAttendanceForStudent = (studentId: string, month: Date, callback: (records: AttendanceRecord[]) => void) => {
    const fromDate = startOfMonth(month).toISOString();
    const toDate = endOfMonth(month).toISOString();

    const fetchAndCallback = async () => {
        const { data, error } = await supabase
            .from(ATTENDANCE_COLLECTION)
            .select('*')
            .eq('student_id', studentId)
            .gte('date', fromDate)
            .lte('date', toDate);

        if (error) {
            console.error("Error fetching student attendance:", error);
            callback([]);
            return;
        }
        callback(data || []);
    };
    
    // Initial fetch
    fetchAndCallback();

    // Real-time subscription
    const channel = supabase
        .channel(`student-attendance-${studentId}-${format(month, 'yyyy-MM')}`)
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: ATTENDANCE_COLLECTION, 
            filter: `student_id=eq.${studentId}` 
        },
        (payload) => {
            fetchAndCallback(); // Refetch all for simplicity
        })
        .subscribe();
        
    return channel;
};
